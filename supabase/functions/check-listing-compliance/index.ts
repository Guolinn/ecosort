import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, category, imageUrl } = await req.json();

    // Try Gemini first, fallback to OpenAI
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    const prompt = `You are a marketplace content moderator. Analyze this listing for policy violations.

**Listing Details:**
- Title: ${title}
- Description: ${description || 'No description'}
- Category: ${category}
${imageUrl ? `- Has image: Yes` : '- Has image: No'}

**Check for these violations (score each 0-10, higher = more severe):**
1. Prohibited items (weapons, drugs, counterfeit, stolen goods, hazardous materials)
2. Inappropriate content (profanity, offensive language, discrimination)
3. Misleading information (false claims, price manipulation)
4. Spam or scam indicators
5. Quality issues (incomplete info, suspicious patterns)

**Response Format - ONLY valid JSON, no markdown:**
{"riskScore": 1, "violations": [], "recommendation": "approve", "summary": "Brief explanation"}

**Scoring Guide:**
- 1-3: Safe, no issues
- 4-6: Minor concerns, may need review
- 7-8: Significant concerns, requires admin review
- 9-10: Clear violations, should be rejected`;

    let result;

    // Try Gemini first
    if (GEMINI_API_KEY) {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 300,
              },
            }),
          }
        );

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[0]);
            }
          }
        } else {
          console.error("Gemini API error:", await geminiResponse.text());
        }
      } catch (e) {
        console.error("Gemini error:", e);
      }
    }

    // Fallback to OpenAI
    if (!result && OPENAI_API_KEY) {
      try {
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 300,
          }),
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          const content = openaiData.choices?.[0]?.message?.content;
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[0]);
            }
          }
        } else {
          console.error("OpenAI API error:", await openaiResponse.text());
        }
      } catch (e) {
        console.error("OpenAI error:", e);
      }
    }

    // If no AI available, auto-approve simple listings
    if (!result) {
      // Simple heuristic check for obvious issues
      const titleLower = title.toLowerCase();
      const descLower = (description || '').toLowerCase();
      const combinedText = titleLower + ' ' + descLower;
      
      const badWords = ['weapon', 'gun', 'drug', 'stolen', 'fake', 'counterfeit'];
      const hasBadWords = badWords.some(word => combinedText.includes(word));
      
      result = {
        riskScore: hasBadWords ? 7 : 2,
        violations: hasBadWords ? ['Potential policy violation detected'] : [],
        recommendation: hasBadWords ? 'review' : 'approve',
        summary: hasBadWords ? 'Manual review recommended' : 'Looks good, no obvious issues',
      };
    }

    // Validate and normalize the response
    const riskScore = Math.min(10, Math.max(1, parseInt(result.riskScore) || 2));
    const violations = Array.isArray(result.violations) ? result.violations : [];
    
    // Determine action based on score
    let action: 'auto_approve' | 'needs_review' | 'auto_reject';
    if (riskScore < 7) {
      action = 'auto_approve';
    } else if (riskScore <= 8) {
      action = 'needs_review';
    } else {
      action = 'auto_reject';
    }

    return new Response(JSON.stringify({
      riskScore,
      violations,
      summary: result.summary || 'Check complete',
      action,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Compliance check error:', error);
    
    // Default to auto-approve for simple items to not block users
    return new Response(JSON.stringify({
      riskScore: 2,
      violations: [],
      summary: 'Auto-approved (check unavailable)',
      action: 'auto_approve',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

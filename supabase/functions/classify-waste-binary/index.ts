import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, accept, accept-language, x-requested-with",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const contentType = req.headers.get("content-type") || "";
    let imageDataUrl = "";

    if (contentType.includes("application/json")) {
      const { imageBase64 } = await req.json();
      if (!imageBase64) {
        return new Response(JSON.stringify({ error: "No image provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      imageDataUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;
    } else {
      const bytes = new Uint8Array(await req.arrayBuffer());
      if (!bytes.length) {
        return new Response(JSON.stringify({ error: "No image provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      imageDataUrl = `data:image/jpeg;base64,${encode(bytes.buffer)}`;
    }

    const classification = await classifyWithOpenAI(imageDataUrl, OPENAI_API_KEY);

    return new Response(JSON.stringify(classification), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("classify-waste-binary error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Classification failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function classifyWithOpenAI(imageDataUrl: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: getPrompt() },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const textResponse = data.choices?.[0]?.message?.content as string | undefined;
  return parseClassification(textResponse);
}

function getPrompt(): string {
  return `You are a waste classification expert. Analyze this image and identify the waste item shown.

Respond ONLY with a valid JSON object in this exact format (no markdown, no code blocks, just the JSON):
{
  "name": "item name in English",
  "category": "one of: recyclable, compost, hazardous, landfill, electronic",
  "confidence": 0.0 to 1.0,
  "points": 5 to 25 based on environmental impact
}

Category definitions:
- recyclable: plastic bottles, paper, cardboard, glass, metal cans
- compost: food scraps, yard waste, coffee grounds, eggshells
- hazardous: batteries, chemicals, paint, light bulbs, medications
- landfill: mixed materials, styrofoam, certain plastics, contaminated items
- electronic: phones, computers, chargers, cables, appliances

Points guide:
- 5-10: common landfill items
- 10-15: recyclable/compost items
- 15-20: electronic waste
- 20-25: hazardous items (proper disposal is critical)

If you cannot identify a waste item in the image, respond with:
{"name": "Unknown Item", "category": "landfill", "confidence": 0.0, "points": 5}`;
}

function parseClassification(textResponse: string | undefined) {
  if (!textResponse) throw new Error("No response from AI");

  let classification: any;
  try {
    const cleanedResponse = textResponse
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    classification = JSON.parse(cleanedResponse);
  } catch {
    classification = {
      name: "Unknown Item",
      category: "landfill",
      confidence: 0.0,
      points: 5,
    };
  }

  const validCategories = ["recyclable", "compost", "hazardous", "landfill", "electronic"];
  if (!validCategories.includes(classification.category)) {
    classification.category = "landfill";
  }
  classification.points = Math.max(5, Math.min(25, classification.points || 10));
  return classification;
}

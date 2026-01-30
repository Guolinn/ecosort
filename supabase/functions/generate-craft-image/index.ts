// Edge Function: generate-craft-image — NanoBanana craft idea generator using Gemini
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  // Handle CORS preflight immediately
  if (req.method === 'OPTIONS') {
    // NOTE: Some edge-runtime/Deno versions throw if you pass a body arg (even null)
    // with a 204 status. A simple 200 "ok" is the most compatible preflight response.
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const { scanId, itemName, imageBase64 } = await req.json();

    if (!scanId || !itemName) {
      return new Response(
        JSON.stringify({ error: 'Missing scanId or itemName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate craft idea image using Gemini 2.0 Flash
    const prompt = `Create a STUNNING, PROFESSIONAL product photo of an upcycled craft made from a "${itemName}".

STYLE: Pinterest-worthy, Instagram aesthetic, professional product photography
LIGHTING: Soft natural lighting, slight shadows for depth
BACKGROUND: Clean white or soft pastel gradient

CRAFT IDEAS BY MATERIAL:
- Plastic bottles → elegant self-watering planters, modern bird feeders, geometric lamp shades
- Cans/tins → chic succulent planters with paint, vintage-style pencil holders, hanging herb gardens
- Glass jars → sophisticated candle holders, modern terrariums, fairy light lanterns
- Cardboard → architectural desk organizers, stylish gift boxes, wall art installations
- Snack bags → woven tote bags, colorful pouches, artistic wall hangings
- Clothing → trendy tote bags, patchwork pillows, braided rugs

REQUIREMENTS:
✓ The "${itemName}" is clearly recognizable as the main material
✓ Finished craft looks PROFESSIONAL and DESIRABLE
✓ Magazine-quality composition
✓ Minimalist, modern aesthetic
✓ Would get 10k likes on Instagram

DO NOT create: cartoonish images, clipart style, messy DIY looks, childish crafts.
CREATE: Something you'd see on Architectural Digest or a high-end craft blog.`;

    console.log('Generating craft image for:', itemName);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'API quota exceeded', 
            details: 'Please try again later or check your Gemini API billing.',
            retryAfter: 60
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    
    // Extract image from response
    let imageData: string | null = null;
    let mimeType = 'image/png';
    
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || 'image/png';
        break;
      }
    }

    if (!imageData) {
      console.error('No image in Gemini response:', JSON.stringify(geminiData));
      return new Response(
        JSON.stringify({ error: 'No image generated', details: 'Gemini did not return an image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode base64 and upload to Supabase Storage
    const imageBytes = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    const extension = mimeType.includes('png') ? 'png' : 'jpg';
    const fileName = `craft-${scanId}-${Date.now()}.${extension}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('craft-images')
      .upload(fileName, imageBytes, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('craft-images')
      .getPublicUrl(fileName);

    // Update scan_history with craft image URL
    const { error: updateError } = await supabase
      .from('scan_history')
      .update({ craft_image_url: publicUrl })
      .eq('id', scanId);

    if (updateError) {
      console.error('Database update error:', updateError);
      // Don't throw - image was generated successfully
    }

    console.log('Craft image generated successfully:', publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        craftImageUrl: publicUrl,
        message: 'Craft idea generated!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('generate-craft-image error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

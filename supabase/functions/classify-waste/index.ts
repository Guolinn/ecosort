// Edge Function: classify-waste — v3 (new categories)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, accept-language, x-requested-with, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let imageBase64: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (file instanceof File) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (bytes.length) {
          imageBase64 = encode(bytes.buffer);
        }
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      imageBase64 = body?.imageBase64;
    } else {
      const bytes = new Uint8Array(await req.arrayBuffer());
      if (bytes.length) {
        imageBase64 = encode(bytes.buffer);
      }
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    console.log('Using OpenAI API with new categories...');
    const classification = await classifyWithOpenAI(imageBase64, OPENAI_API_KEY);

    return new Response(
      JSON.stringify(classification),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('classify-waste error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Classification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function classifyWithOpenAI(imageBase64: string, apiKey: string) {
  const imageUrl = imageBase64.startsWith('data:') 
    ? imageBase64 
    : `data:image/jpeg;base64,${imageBase64}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: getPrompt() },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }],
      max_tokens: 300,
      temperature: 0.1
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const textResponse = data.choices?.[0]?.message?.content;
  return parseClassification(textResponse);
}


function getPrompt(): string {
  return `You are a waste classification expert. Identify what the user wants to DISPOSE OF.

## CRITICAL RULES

### Human Detection (99% of the time should be FALSE!)
**isHuman=true** ONLY when:
- The image is a SELFIE or portrait where a human FACE is the ONLY subject
- No objects are being held or shown
- The face takes up most of the frame (>50%)

**isHuman=false** (DEFAULT!) when:
- Someone is HOLDING an object → classify the OBJECT
- A hand appears with an item → classify the ITEM  
- Any waste item is visible → classify the ITEM
- Person in background → classify foreground object
- Body parts without clear face → NOT human

**If you identify ANY object name, isHuman MUST be false!**

### Gender Detection
Only if isHuman=true AND face is clearly visible:
- Set humanGender to "male" or "female" based on appearance
- If uncertain, still pick one based on best guess

### Priority Rules
1. Food waste > container (rice in pot → "Leftover Rice", compost)
2. Object being held > person holding it
3. Empty containers/utensils → classify the container material

## Categories (6 total)
1. **clothing** - Textiles, fabric, clothes, shoes → Purple
2. **electronics** - Phones, earbuds, chargers, cables → Orange  
3. **compost** - Food scraps, leftovers, organic → Green
4. **recyclable** - Metal, glass, plastic, paper, cardboard containers → Blue
5. **hazardous** - Batteries, bulbs, medications, paint, chemicals → Red
6. **other** - ONLY: styrofoam, tissues, diapers, contaminated beyond cleaning → Grey

### Recyclable Examples (NEVER classify as "other"!)
- CUPS: ceramic cups, glass cups, plastic cups, paper cups, mugs → recyclable
- METAL: pots, pans, cans, utensils, cutlery → recyclable  
- GLASS: bottles, jars, drinking glasses → recyclable
- PLASTIC: bottles, containers, packaging → recyclable
- PAPER: boxes, newspapers, cardboard → recyclable

### canTrade Flag
Set canTrade=true for: usable items, clean containers, intact cups/mugs/glasses, cookware
Set canTrade=false for: food waste, contaminated, hazardous, broken beyond repair

### hasCreativePotential Flag (IMPORTANT!)
Set hasCreativePotential=true for:
- ALL recyclable items (bottles, cans, jars, cups, containers, cardboard)
- ALL clothing items
- Clean packaging materials
Then provide a creativeSuggestion with a DIY/upcycle idea!

Set hasCreativePotential=false ONLY for: compost, hazardous, severely contaminated items

## Hazardous Examples
Batteries, light bulbs, medications, paint, pesticides, thermometers → hazardous!

## Response (JSON only):
{
  "name": "Item name (or 'Human' only if pure selfie)",
  "category": "compost|recyclable|clothing|electronics|hazardous|other",
  "confidence": 0.0-1.0,
  "points": 10-30,
  "canTrade": true/false,
  "aiSuggestion": "disposal tip",
  "hasCreativePotential": true/false,
  "creativeSuggestion": "DIY idea (REQUIRED if hasCreativePotential is true)",
  "isHuman": false,
  "humanGender": null
}

**CRITICAL: Cups, mugs, glasses are RECYCLABLE (not "other")! If recyclable/clothing → hasCreativePotential should be TRUE!**`;
}

function parseClassification(textResponse: string | undefined) {
  if (!textResponse) {
    throw new Error('No response from AI');
  }

  let classification;
  try {
    const cleanedResponse = textResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    classification = JSON.parse(cleanedResponse);
  } catch (parseError) {
    console.error('Failed to parse AI response:', textResponse);
    classification = {
      name: 'Unknown Item',
      category: 'other',
      confidence: 0.0,
      points: 5,
      canTrade: false,
      aiSuggestion: 'Unable to identify. Place in general waste bin.',
      hasCreativePotential: false,
      creativeSuggestion: null
    };
  }

  // Validate category - now includes hazardous
  const validCategories = ['clothing', 'electronics', 'compost', 'recyclable', 'hazardous', 'other'];
  if (!validCategories.includes(classification.category)) {
    // If AI returned 'creative', map to recyclable
    if (classification.category === 'creative') {
      classification.category = 'recyclable';
      classification.hasCreativePotential = true;
    } else {
      classification.category = 'other';
    }
  }

  // Ensure points are within range, add bonus for creative potential
  let basePoints = Math.max(5, Math.min(30, classification.points || 10));
  if (classification.hasCreativePotential) {
    basePoints = Math.min(30, basePoints + 5);
  }
  classification.points = basePoints;

  // Ensure aiSuggestion is always present
  if (!classification.aiSuggestion) {
    classification.aiSuggestion = getDefaultSuggestion(classification.category, classification.canTrade);
  }

  // Ensure creative fields exist - recyclable and clothing should ALWAYS have creative potential
  const shouldHaveCreativePotential = 
    classification.category === 'recyclable' || 
    classification.category === 'clothing' ||
    classification.hasCreativePotential === true;
  
  classification.hasCreativePotential = shouldHaveCreativePotential;
  classification.creativeSuggestion = shouldHaveCreativePotential 
    ? (classification.creativeSuggestion || getDefaultCreativeSuggestion(classification.name, classification.category)) 
    : null;

  // Ensure human detection fields exist
  // CRITICAL: If we identified an actual item, force isHuman to false!
  const hasValidItemName = classification.name && 
    classification.name.toLowerCase() !== 'human' && 
    classification.name.toLowerCase() !== 'null' &&
    classification.name.toLowerCase() !== 'unknown' &&
    classification.name.trim() !== '';
  
  if (hasValidItemName) {
    // We found an item, so this is NOT a human detection
    classification.isHuman = false;
    classification.humanGender = null;
  } else {
    classification.isHuman = classification.isHuman || false;
    classification.humanGender = classification.isHuman ? (classification.humanGender || null) : null;
  }

  return classification;
}

function getDefaultSuggestion(category: string, canTrade: boolean): string {
  if (canTrade) {
    return 'This item is still usable! Consider selling or donating it.';
  }
  switch (category) {
    case 'clothing':
      return 'Donate to charity or sell on second-hand platforms.';
    case 'electronics':
      return 'Take to an e-waste recycling center or sell if still working.';
    case 'compost':
      return 'Add to compost bin or green waste collection.';
    case 'recyclable':
      return 'Clean and place in recycling bin.';
    case 'hazardous':
      return '⚠️ Take to a hazardous waste collection point. Do NOT put in regular bins!';
    default:
      return 'Place in general waste bin.';
  }
}

function getDefaultCreativeSuggestion(name: string, category: string): string {
  const n = (name || '').toLowerCase();
  
  // Cups and mugs
  if (/cup|mug|glass/.test(n)) {
    return 'Turn it into a pencil holder, small planter, or candle holder!';
  }
  // Bottles
  if (/bottle/.test(n)) {
    return 'Transform it into a vase, bird feeder, or self-watering planter!';
  }
  // Jars
  if (/jar/.test(n)) {
    return 'Use as a storage container, candle holder, or mini terrarium!';
  }
  // Cans
  if (/can|tin/.test(n)) {
    return 'Make a pencil holder, lantern, or organizer!';
  }
  // Cardboard/boxes
  if (/box|cardboard/.test(n)) {
    return 'Create storage organizers, gift boxes, or kids craft projects!';
  }
  // Clothing
  if (category === 'clothing') {
    return 'Upcycle into a tote bag, patchwork project, or cleaning cloths!';
  }
  // Generic recyclable
  if (category === 'recyclable') {
    return 'This item has DIY craft potential! Get creative with upcycling!';
  }
  
  return 'This item has DIY craft potential!';
}

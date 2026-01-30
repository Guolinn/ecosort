import { SUPABASE_URL } from '@/integrations/supabase/client';
import { WasteCategory } from '@/types/waste';

export interface ClassificationResult {
  name: string;
  category: WasteCategory;
  confidence?: number;
  points: number;
  aiSuggestion?: string;
  hasCreativePotential?: boolean;
  creativeSuggestion?: string | null;
  isHuman?: boolean;
  humanGender?: 'male' | 'female' | null;
  isRetry?: boolean; // Failed to identify, prompt user to retry
}

const containsCJK = (s: string) => /[\u4E00-\u9FFF]/.test(s);

const defaultDisposalSuggestion = (category: WasteCategory) => {
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
};

const defaultCreativeSuggestion = (name: string, category: WasteCategory) => {
  const n = name.toLowerCase();

  if (category === 'recyclable') {
    if (/(bag|wrapper|packaging|pouch)/.test(n)) {
      return 'Cut into strips and weave into a small pouch or basket.';
    }
    if (/(can|tin)/.test(n)) {
      return 'Rinse it and turn it into a pencil holder or small planter.';
    }
    if (/(bottle)/.test(n)) {
      return 'Turn it into a bird feeder or a self-watering planter.';
    }
    if (/(jar|glass)/.test(n)) {
      return 'Use it as a candle holder, storage jar, or mini terrarium.';
    }
    return 'Upcycle it into an organizer, decoration, or kids craft project.';
  }

  if (category === 'clothing') {
    return 'Upcycle it into a tote bag, patchwork cloth, or cleaning rags.';
  }

  return null;
};

const normalizePackagingName = (name: string, category: WasteCategory) => {
  // Heuristic: when category is recyclable but the model returns a food item name,
  // it’s likely the packaging. Rename to packaging-focused term.
  if (category !== 'recyclable') return name;
  const n = name.toLowerCase();
  const looksLikeFood = /(cookie|cookies|biscuit|cracker|chips|snack|candy|chocolate|bread|cake)/.test(n);
  if (looksLikeFood) return 'snack packaging';
  return name;
};

const dataUrlToBlob = (dataUrl: string): Blob => {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) throw new Error('Invalid data URL');
  const meta = dataUrl.slice(0, commaIndex);
  const base64 = dataUrl.slice(commaIndex + 1);
  const mimeMatch = meta.match(/^data:([^;]+);base64$/i);
  const mime = mimeMatch?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

export const classifyWasteImageBinary = async (imageBase64: string): Promise<ClassificationResult> => {
  const dataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  let blob: Blob;
  try {
    blob = dataUrlToBlob(dataUrl);
  } catch (e) {
    console.warn('[classifier] dataUrlToBlob failed, falling back to fetch(dataUrl)', e);
    try {
      blob = await (await fetch(dataUrl)).blob();
    } catch (err) {
      throw new Error(`图片读取失败 | ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const url = `${SUPABASE_URL}/functions/v1/classify-waste`;

  const form = new FormData();
  form.append('file', blob, 'waste.jpg');

  let resp: Response;
  try {
    resp = await fetch(url, { method: 'POST', body: form });
  } catch (err) {
    throw new Error(`网络请求失败 | ${err instanceof Error ? err.message : String(err)}`);
  }

  let text = '';
  try {
    text = await resp.text();
  } catch (err) {
    throw new Error(`读取响应失败 | ${err instanceof Error ? err.message : String(err)}`);
  }

  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // non-json response
  }

  if (!resp.ok) {
    throw new Error(`识别请求失败 | HTTP ${resp.status} | ${data?.error || text || 'unknown'}`);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  // IMPORTANT: Check for human FIRST before checking for unidentified
  // Because when a human is detected, name might still be "null"
  const isHuman = data?.isHuman === true;
  if (isHuman) {
    const humanGender = data.humanGender as 'male' | 'female' | null;
    return {
      name: 'Human Detected',
      category: 'other' as WasteCategory,
      confidence: data.confidence || 0.9,
      points: 0,
      aiSuggestion: "This is a waste scanner, not a mirror!",
      hasCreativePotential: false,
      creativeSuggestion: null,
      isHuman: true,
      humanGender,
    };
  }

  // Check for null/unidentified/unknown response - return retry signal
  const nameLower = (data?.name || '').toLowerCase().trim();
  const isUnidentified = !data?.name || 
    !data?.category || 
    nameLower === 'null' || 
    nameLower === 'unknown' || 
    nameLower === 'unidentified' ||
    nameLower === '' ||
    nameLower === 'n/a';
  
  if (isUnidentified) {
    return {
      name: 'Unidentified',
      category: 'other' as WasteCategory,
      points: 0,
      aiSuggestion: 'Please try again with a clearer photo.',
      isRetry: true,
    };
  }

  // Human check was already done above, proceed with waste classification

  return {
    name: normalizePackagingName(data.name, data.category as WasteCategory),
    category: data.category as WasteCategory,
    confidence: data.confidence || 0.5,
    points: data.points || 10,
    aiSuggestion:
      typeof data.aiSuggestion === 'string' && data.aiSuggestion.trim() && !containsCJK(data.aiSuggestion)
        ? data.aiSuggestion
        : defaultDisposalSuggestion(data.category as WasteCategory),
    hasCreativePotential:
      typeof data.hasCreativePotential === 'boolean'
        ? data.hasCreativePotential
        : (data.category as WasteCategory) === 'recyclable' || (data.category as WasteCategory) === 'clothing',
    creativeSuggestion: (() => {
      const category = data.category as WasteCategory;
      const hasPotential =
        typeof data.hasCreativePotential === 'boolean'
          ? data.hasCreativePotential
          : category === 'recyclable' || category === 'clothing';

      if (!hasPotential) return null;

      if (typeof data.creativeSuggestion === 'string' && data.creativeSuggestion.trim() && !containsCJK(data.creativeSuggestion)) {
        return data.creativeSuggestion;
      }

      const safeName = normalizePackagingName(data.name, category);
      return defaultCreativeSuggestion(safeName, category);
    })(),
    isHuman: false,
    humanGender: null,
  };
};

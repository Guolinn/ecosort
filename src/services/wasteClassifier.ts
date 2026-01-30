import { supabase } from '@/integrations/supabase/client';
import { WasteCategory } from '@/types/waste';

export interface ClassificationResult {
  name: string;
  category: WasteCategory;
  confidence: number;
  points: number;
  isHuman?: boolean;
  humanGender?: 'male' | 'female' | null;
}

export const classifyWasteImage = async (imageBase64: string): Promise<ClassificationResult> => {
  console.log('Starting waste classification...');
  // Helpful diagnostics for mobile failures (payload too large often shows up as fetch failures).
  try {
    const approxBytes = Math.floor((imageBase64.length * 3) / 4);
    const approxKb = Math.round(approxBytes / 1024);
    console.log('Classification payload size (approx KB):', approxKb);
  } catch {
    // ignore
  }
  
  const { data, error } = await supabase.functions.invoke('classify-waste', {
    body: { imageBase64 },
  });

  console.log('Classification response:', { data, error });

  if (error) {
    // supabase-js wraps different failures into different error types.
    // Enrich the message so the toast tells us if it's HTTP vs network vs relay.
    console.error('Classification error (raw):', error);
    const anyErr = error as any;
    const context = anyErr?.context;
    const status = context?.status;
    const statusText = context?.statusText;
    const name = anyErr?.name;
    const causeMsg = anyErr?.cause?.message;

    const parts = [
      '识别请求失败（Edge Function）',
      name ? `类型: ${name}` : null,
      status ? `HTTP: ${status}${statusText ? ` ${statusText}` : ''}` : null,
      causeMsg ? `原因: ${causeMsg}` : null,
      error.message ? `信息: ${error.message}` : null,
    ].filter(Boolean);

    throw new Error(parts.join(' | '));
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.name || !data?.category) {
    throw new Error('Invalid response from AI service');
  }

  return {
    name: data.name,
    category: data.category as WasteCategory,
    confidence: data.confidence || 0.5,
    points: data.points || 10,
    isHuman: data.isHuman || false,
    humanGender: data.humanGender || null,
  };
};

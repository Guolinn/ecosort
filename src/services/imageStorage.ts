import { supabase } from '@/integrations/supabase/client';

/**
 * Converts a base64 image string to a File object
 */
const base64ToFile = (base64: string, filename: string): File => {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const mimeMatch = base64.match(/data:([^;]+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  return new File([blob], filename, { type: mimeType });
};

/**
 * Upload an image to Supabase Storage and return the public URL
 */
export const uploadScanImage = async (
  base64Image: string,
  userId: string
): Promise<string | null> => {
  try {
    const timestamp = Date.now();
    const filename = `${userId}/${timestamp}.jpg`;
    const file = base64ToFile(base64Image, `${timestamp}.jpg`);

    const { data, error } = await supabase.storage
      .from('scan-images')
      .upload(filename, file, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('scan-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadScanImage:', error);
    return null;
  }
};

/**
 * Delete an image from Supabase Storage
 */
export const deleteScanImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract the path from the URL
    const urlParts = imageUrl.split('/scan-images/');
    if (urlParts.length < 2) return false;
    
    const path = urlParts[1];
    
    const { error } = await supabase.storage
      .from('scan-images')
      .remove([path]);

    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteScanImage:', error);
    return false;
  }
};

import { supabase } from '@/integrations/supabase/client';

/**
 * Get a signed URL for private storage objects
 */
export async function getSignedUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('get-signed-url', {
      body: { path, expiresIn }
    });

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error invoking signed URL function:', error);
    return null;
  }
}

/**
 * Upload a file to the food-images bucket with user folder structure
 */
export async function uploadFoodImage(file: File, userId: string): Promise<{ path: string | null; error: any }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('food-images')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      return { path: null, error };
    }

    return { path: data.path, error: null };
  } catch (error) {
    console.error('Upload error:', error);
    return { path: null, error };
  }
}

/**
 * Delete a file from the food-images bucket
 */
export async function deleteFoodImage(path: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase.storage
      .from('food-images')
      .remove([path]);

    return { error };
  } catch (error) {
    console.error('Delete error:', error);
    return { error };
  }
}
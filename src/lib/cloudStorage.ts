import { supabase } from './supabase';

export interface UploadedFile {
  id: string;
  sessionId: string;
  orderItemId: string;
  tabId: string;
  storagePath: string;
  storageUrl: string;
  fileType: 'pdf' | 'jpg' | 'jpeg' | 'png';
  fileSize: number;
  originalFilename: string;
  uploadedAt: string;
}

export interface FileUploadResult {
  success: boolean;
  file?: UploadedFile;
  error?: string;
}

export async function uploadDesignFile(
  file: File,
  sessionId: string,
  csvFilename: string,
  orderNumber: string,
  orderItemId: string,
  tabId: string
): Promise<FileUploadResult> {
  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const sanitizedCsvName = csvFilename.replace(/\.csv$/i, '').replace(/[^a-zA-Z0-9-_]/g, '_');
    const sanitizedOrderNumber = orderNumber.replace(/[^a-zA-Z0-9-_]/g, '_');

    const storagePath = `${sanitizedCsvName}/${sanitizedOrderNumber}/${tabId}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('design-files')
      .upload(storagePath, file, {
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return {
        success: false,
        error: `Failed to upload file: ${uploadError.message}`
      };
    }

    const { data: urlData } = supabase.storage
      .from('design-files')
      .getPublicUrl(storagePath);

    const storageUrl = urlData.publicUrl;

    const { data: dbData, error: dbError } = await supabase
      .from('session_uploaded_files')
      .upsert({
        session_id: sessionId,
        order_item_id: orderItemId,
        tab_id: tabId,
        storage_path: storagePath,
        storage_url: storageUrl,
        file_type: fileExt as 'pdf' | 'jpg' | 'jpeg' | 'png',
        file_size: file.size,
        original_filename: file.name,
        uploaded_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,order_item_id,tab_id'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return {
        success: false,
        error: `Failed to save file record: ${dbError.message}`
      };
    }

    return {
      success: true,
      file: {
        id: dbData.id,
        sessionId: dbData.session_id,
        orderItemId: dbData.order_item_id,
        tabId: dbData.tab_id,
        storagePath: dbData.storage_path,
        storageUrl: dbData.storage_url,
        fileType: dbData.file_type,
        fileSize: dbData.file_size,
        originalFilename: dbData.original_filename,
        uploadedAt: dbData.uploaded_at
      }
    };
  } catch (error) {
    console.error('Unexpected error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getSessionFiles(sessionId: string): Promise<UploadedFile[]> {
  const { data, error } = await supabase
    .from('session_uploaded_files')
    .select('*')
    .eq('session_id', sessionId);

  if (error) {
    console.error('Error fetching session files:', error);
    return [];
  }

  return data.map(file => ({
    id: file.id,
    sessionId: file.session_id,
    orderItemId: file.order_item_id,
    tabId: file.tab_id,
    storagePath: file.storage_path,
    storageUrl: file.storage_url,
    fileType: file.file_type,
    fileSize: file.file_size,
    originalFilename: file.original_filename,
    uploadedAt: file.uploaded_at
  }));
}

export async function getFileForTab(
  sessionId: string,
  orderItemId: string,
  tabId: string
): Promise<UploadedFile | null> {
  const { data, error } = await supabase
    .from('session_uploaded_files')
    .select('*')
    .eq('session_id', sessionId)
    .eq('order_item_id', orderItemId)
    .eq('tab_id', tabId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching file:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    sessionId: data.session_id,
    orderItemId: data.order_item_id,
    tabId: data.tab_id,
    storagePath: data.storage_path,
    storageUrl: data.storage_url,
    fileType: data.file_type,
    fileSize: data.file_size,
    originalFilename: data.original_filename,
    uploadedAt: data.uploaded_at
  };
}

export async function deleteSessionFiles(sessionId: string): Promise<boolean> {
  const files = await getSessionFiles(sessionId);

  if (files.length === 0) {
    return true;
  }

  const paths = files.map(f => f.storagePath);

  const { error: storageError } = await supabase.storage
    .from('design-files')
    .remove(paths);

  if (storageError) {
    console.error('Error deleting files from storage:', storageError);
    return false;
  }

  const { error: dbError } = await supabase
    .from('session_uploaded_files')
    .delete()
    .eq('session_id', sessionId);

  if (dbError) {
    console.error('Error deleting file records:', dbError);
    return false;
  }

  return true;
}

export async function fetchFileAsBlob(storageUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(storageUrl);
    if (!response.ok) {
      console.error('Failed to fetch file:', response.statusText);
      return null;
    }
    return await response.blob();
  } catch (error) {
    console.error('Error fetching file:', error);
    return null;
  }
}

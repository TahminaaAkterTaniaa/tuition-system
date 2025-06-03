import { put, del } from '@vercel/blob';

// Interface for upload result
export interface BlobUploadResult {
  success: boolean;
  url?: string;
  blobId?: string;
  error?: string;
}

/**
 * Uploads a file to Vercel Blob Storage
 * @param buffer - The file buffer to upload
 * @param fileName - Original filename
 * @param fileType - Type of document (used for folder organization)
 * @returns Promise<BlobUploadResult>
 */
export async function uploadToBlob(
  buffer: Buffer, 
  fileName: string,
  fileType: string
): Promise<BlobUploadResult> {
  try {
    // Generate a unique filename
    const uniqueFileName = `${fileType}_${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
    
    console.log(`Uploading ${fileName} to Vercel Blob as ${uniqueFileName}...`);
    
    // Upload to Vercel Blob
    const blob = await put(uniqueFileName, buffer, {
      access: 'public',
      contentType: getContentType(fileName),
      addRandomSuffix: true, // Add a random suffix to ensure uniqueness
    });
    
    console.log('Vercel Blob upload success:', blob.url);
    
    return {
      success: true,
      url: blob.url,
      blobId: blob.pathname, // This can be used later for deletion
    };
  } catch (error) {
    console.error('Error in uploadToBlob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during file upload',
    };
  }
}

/**
 * Deletes a file from Vercel Blob Storage
 * @param blobId - The blob ID to delete
 * @returns Promise<boolean>
 */
export async function deleteFromBlob(blobId: string): Promise<boolean> {
  try {
    await del(blobId);
    return true;
  } catch (error) {
    console.error('Error deleting blob:', error);
    return false;
  }
}

/**
 * Determines the content type based on file extension
 * @param filename - The filename to analyze
 * @returns string representing the MIME type
 */
function getContentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream'; // Default binary file type
  }
}

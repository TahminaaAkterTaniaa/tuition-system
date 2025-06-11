import { put, del } from '@vercel/blob';

// For debugging configuration issues
const VERCEL_BLOB_STORE = process.env.BLOB_READ_WRITE_TOKEN ? 'Configured' : 'Missing';
console.log(`[BlobStorage] Vercel Blob configuration status: ${VERCEL_BLOB_STORE}`);

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
  const startTime = Date.now();
  console.log(`[BlobStorage] uploadToBlob called with: fileName=${fileName}, fileType=${fileType}, bufferSize=${buffer.length} bytes`);
  
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[BlobStorage] ERROR: Missing BLOB_READ_WRITE_TOKEN environment variable');
    return {
      success: false,
      error: 'Blob storage configuration is missing (BLOB_READ_WRITE_TOKEN)',
    };
  }
  
  try {
    // Generate a unique filename
    const uniqueFileName = `${fileType}_${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
    
    console.log(`[BlobStorage] Uploading ${fileName} to Vercel Blob as ${uniqueFileName}...`);
    console.log(`[BlobStorage] File details: size=${buffer.length}, type=${getContentType(fileName)}`);
    
    // Upload to Vercel Blob
    console.log(`[BlobStorage] Calling Vercel Blob put() method...`);
    let blob;
    
    try {
      blob = await put(uniqueFileName, buffer, {
        access: 'public',
        contentType: getContentType(fileName),
        addRandomSuffix: true, // Add a random suffix to ensure uniqueness
      });
    } catch (putError) {
      console.error('[BlobStorage] Error during Vercel Blob put() operation:', putError);
      
      // Get more details about the error
      if (putError instanceof Error) {
        console.error(`[BlobStorage] Error name: ${putError.name}, message: ${putError.message}`);
        console.error(`[BlobStorage] Stack trace: ${putError.stack}`);
      } else {
        console.error('[BlobStorage] Non-Error object thrown:', putError);
      }
      
      throw putError; // Re-throw for the outer catch block
    }
    
    const uploadDuration = Date.now() - startTime;
    console.log(`[BlobStorage] Vercel Blob upload success (took ${uploadDuration}ms):`, {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: blob.size,
    });
    
    return {
      success: true,
      url: blob.url,
      blobId: blob.pathname, // This can be used later for deletion
    };
  } catch (error) {
    const uploadDuration = Date.now() - startTime;
    console.error(`[BlobStorage] Error in uploadToBlob (after ${uploadDuration}ms):`, error);
    
    // Detailed error analysis
    if (error instanceof Error) {
      console.error(`[BlobStorage] Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.message.includes('BLOB_READ_WRITE_TOKEN')) {
        console.error('[BlobStorage] Environment configuration issue detected with BLOB_READ_WRITE_TOKEN');
      } else if (error.message.includes('network')) {
        console.error('[BlobStorage] Network connectivity issue detected');
      }
    }
    
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
  console.log(`[BlobStorage] Attempting to delete blob with ID: ${blobId}`);
  
  if (!blobId) {
    console.error('[BlobStorage] Invalid blob ID provided (empty or undefined)');
    return false;
  }
  
  try {
    console.log(`[BlobStorage] Calling Vercel Blob del() method...`);
    await del(blobId);
    console.log(`[BlobStorage] Successfully deleted blob with ID: ${blobId}`);
    return true;
  } catch (error) {
    console.error('[BlobStorage] Error deleting blob:', error);
    
    if (error instanceof Error) {
      console.error(`[BlobStorage] Delete error details:`, {
        name: error.name,
        message: error.message
      });
    }
    
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

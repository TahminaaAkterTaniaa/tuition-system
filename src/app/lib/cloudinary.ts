import { v2 as cloudinary } from 'cloudinary';

/**
 * Initializes Cloudinary configuration with environment variables
 * This should be called before each upload operation to ensure configuration is set
 */
function initializeCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Missing Cloudinary credentials. Please check your .env.local file.');
    return false;
  }
  
  // Set Cloudinary configuration
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  
  return true;
}

// Initialize on module load
initializeCloudinary();

// Interface for upload result
export interface CloudinaryUploadResult {
  success: boolean;
  publicId?: string;
  secureUrl?: string;
  error?: string;
}

/**
 * Uploads a file to Cloudinary
 * @param buffer The file buffer to upload
 * @param fileType The type of file being uploaded (for folder organization)
 * @param originalFilename The original filename (for reference)
 * @returns Promise with upload result
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  fileType: string,
  originalFilename: string
): Promise<CloudinaryUploadResult> {
  try {
    // Ensure Cloudinary is configured before every upload attempt
    const configSuccess = initializeCloudinary();
    if (!configSuccess) {
      console.error('Failed to initialize Cloudinary configuration');
      return {
        success: false,
        error: 'Cloud storage configuration error',
      };
    }
    
    // Log config to debug
    const config = cloudinary.config();
    console.log('Cloudinary config for upload:', {
      cloud_name: config.cloud_name ? `${config.cloud_name.substring(0, 3)}...` : 'missing',
      api_key: config.api_key ? `${config.api_key.substring(0, 3)}...` : 'missing',
      api_secret: config.api_secret ? 'present (hidden)' : 'missing',
    });

    // Convert buffer to Base64 data URI
    const base64Data = buffer.toString('base64');
    const contentType = getContentType(originalFilename);
    const dataURI = `data:${contentType};base64,${base64Data}`;
    
    console.log(`Preparing upload for ${originalFilename} (${buffer.length} bytes) of type ${contentType}`);
    
    // Upload options
    const uploadOptions = {
      folder: `tuition-system/${fileType}`,
      resource_type: 'auto' as 'auto', // auto-detect the resource type
      public_id: `${fileType}_${Date.now()}`, // unique identifier
      tags: [fileType], // add tags for easier management
    };
    
    // Upload to Cloudinary using explicit Promise pattern for better error handling
    console.log(`Starting Cloudinary upload process for ${originalFilename}...`);
    
    return await new Promise<CloudinaryUploadResult>((resolve) => {
      cloudinary.uploader.upload(dataURI, uploadOptions, (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          resolve({
            success: false,
            error: `Failed to upload to cloud storage: ${error.message || 'Unknown error'}`,
          });
        } else if (!result) {
          console.error('Cloudinary returned empty result');
          resolve({
            success: false,
            error: 'Cloud storage returned empty result',
          });
        } else {
          console.log('Cloudinary upload success:', result.secure_url);
          resolve({
            success: true,
            publicId: result.public_id,
            secureUrl: result.secure_url,
          });
        }
      });
    });
  } catch (error) {
    console.error('Error in uploadToCloudinary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during upload',
    };
  }
}

/**
 * Helper function to determine content type from filename
 */
function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch(ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Deletes a file from Cloudinary by its public ID
 * @param publicId The public ID of the file to delete
 * @returns Promise with delete result
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
}

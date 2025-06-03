import { join } from 'path';
import { writeFile, mkdir, access, copyFile } from 'fs/promises';
import { constants } from 'fs';
import { randomUUID } from 'crypto';

export interface FileUploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Ensures the uploads directory exists and has proper permissions
 */
export async function ensureUploadsDirectory(uploadPath: string): Promise<boolean> {
  try {
    await access(uploadPath, constants.R_OK | constants.W_OK);
    console.log('Uploads directory exists with proper permissions:', uploadPath);
    return true;
  } catch (err) {
    console.log('Creating uploads directory...', uploadPath);
    try {
      await mkdir(uploadPath, { recursive: true });
      return true;
    } catch (error) {
      console.error('Failed to create uploads directory:', uploadPath, error);
      return false;
    }
  }
}

/**
 * Saves a file to the uploads directory and public/uploads for web access
 */
export async function saveFile(
  file: File,
  fileType: string,
  customFileName?: string
): Promise<FileUploadResult> {
  try {
    // Get file extension
    const originalName = file.name;
    const ext = originalName.split('.').pop()?.toLowerCase();

    // Validate file type
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    if (!ext || !allowedExtensions.includes(ext)) {
      return {
        success: false,
        error: 'Invalid file format. Only JPG, PNG, and PDF files are allowed.',
      };
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size too large. Maximum size is 10MB.',
      };
    }

    // Generate unique filename
    const uniqueId = customFileName || `${fileType}_${randomUUID()}`;
    const fileName = `${uniqueId}.${ext}`;
    
    // Setup paths for both private and public uploads
    const rootDir = process.cwd();
    const uploadDir = join(rootDir, 'uploads');
    const publicUploadDir = join(rootDir, 'public', 'uploads');
    const filePath = join(uploadDir, fileName);
    const publicFilePath = join(publicUploadDir, fileName);

    // Ensure both upload directories exist
    const privateUploadsExist = await ensureUploadsDirectory(uploadDir);
    const publicUploadsExist = await ensureUploadsDirectory(publicUploadDir);
    
    if (!privateUploadsExist || !publicUploadsExist) {
      return {
        success: false,
        error: 'Failed to access or create uploads directories',
      };
    }

    // Convert File to Buffer and save to private uploads
    console.log('Writing file to private uploads:', filePath);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    
    // Save the same file to public uploads for web access
    console.log('Writing file to public uploads:', publicFilePath);
    await writeFile(publicFilePath, buffer);
    
    console.log('File written successfully to both locations');

    // Return the relative path to the file
    return {
      success: true,
      path: fileName,
    };
  } catch (error) {
    console.error('Error saving file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

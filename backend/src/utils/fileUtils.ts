import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

/**
 * Ensure upload directory exists
 */
export const ensureUploadDir = async (uploadPath: string): Promise<void> => {
  try {
    await fs.access(uploadPath);
  } catch {
    await fs.mkdir(uploadPath, { recursive: true });
  }
};

/**
 * Generate unique filename
 */
export const generateUniqueFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const timestamp = Date.now();
  const uuid = uuidv4().substring(0, 8);
  
  return `${name}_${timestamp}_${uuid}${ext}`;
};

/**
 * Upload file to local storage
 */
export const uploadToLocal = async (
  file: Express.Multer.File,
  uploadDir: string = 'uploads'
): Promise<string> => {
  const uploadPath = path.join(process.cwd(), uploadDir);
  await ensureUploadDir(uploadPath);
  
  const filename = generateUniqueFilename(file.originalname);
  const filePath = path.join(uploadPath, filename);
  
  // Optimize image before saving
  await sharp(file.buffer)
    .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(filePath);
  
  return filePath;
};

/**
 * Delete file from local storage
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn(`Failed to delete file ${filePath}:`, error);
  }
};

/**
 * Get file info
 */
export const getFileInfo = async (filePath: string) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      exists: true,
    };
  } catch {
    return {
      exists: false,
    };
  }
};

/**
 * Clean up old files (older than specified days)
 */
export const cleanupOldFiles = async (
  directory: string,
  maxAgeInDays: number = 30
): Promise<number> => {
  try {
    const files = await fs.readdir(directory);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
    
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up old files:', error);
    return 0;
  }
};

/**
 * Validate image file
 */
export const validateImageFile = (file: Express.Multer.File): string | null => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.mimetype)) {
    return 'Invalid file type. Only JPEG, PNG, and WebP are allowed.';
  }
  
  if (file.size > maxSize) {
    return 'File too large. Maximum size is 10MB.';
  }
  
  return null;
};

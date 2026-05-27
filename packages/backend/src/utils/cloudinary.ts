import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger';
import path from 'path';

// Configure Cloudinary with standard settings
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'placeholder_cloud_name',
    api_key: process.env.CLOUDINARY_API_KEY || 'placeholder_api_key',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'placeholder_api_secret',
});

export interface CloudinaryUploadResult {
    secure_url: string;
    public_id: string;
    original_filename: string;
    resource_type: string;
    format: string;
}

/**
 * Uploads a local file to Cloudinary.
 * If Cloudinary credentials are not configured, it emulates the upload locally.
 */
export const uploadToCloudinary = async (
    filePath: string,
    originalName: string,
    mimeType: string,
    userId: number
): Promise<CloudinaryUploadResult> => {
    const isConfigured = 
        process.env.CLOUDINARY_CLOUD_NAME && 
        process.env.CLOUDINARY_API_KEY && 
        process.env.CLOUDINARY_API_SECRET;

    const fileExt = path.extname(originalName).toLowerCase();
    const cleanName = path.basename(originalName, fileExt).replace(/[^a-zA-Z0-9]/g, '_');
    const folder = `leave_docs/user_${userId}`;
    const publicId = `${folder}/${cleanName}_${Date.now()}`;

    if (isConfigured) {
        try {
            logger.info(`Uploading file to Cloudinary: ${originalName} for user ${userId}`);
            
            // Determine resource type: image or raw (for PDF, DOCX, etc.)
            let resourceType: 'image' | 'raw' | 'auto' = 'auto';
            if (['.pdf', '.doc', '.docx'].includes(fileExt)) {
                resourceType = 'raw';
            }

            const response = await cloudinary.uploader.upload(filePath, {
                public_id: publicId,
                resource_type: resourceType,
            });

            return {
                secure_url: response.secure_url,
                public_id: response.public_id,
                original_filename: originalName,
                resource_type: response.resource_type,
                format: response.format || fileExt.replace('.', ''),
            };
        } catch (error) {
            logger.error('Cloudinary upload failed, falling back to local emulation:', error);
        }
    } else {
        logger.warn('Cloudinary not configured. Emulating Cloudinary upload locally.');
    }

    // --- Local Emulation Fallback ---
    const filename = path.basename(filePath);
    // Return relative path or host url (the controller can format the full URL using req headers)
    // To ensure portability, we will return the relative path `/uploads/${filename}` as the reference
    // and let the client read it or format it.
    const emulatedUrl = `/uploads/${filename}`;

    return {
        secure_url: emulatedUrl,
        public_id: publicId,
        original_filename: originalName,
        resource_type: ['.jpg', '.jpeg', '.png'].includes(fileExt) ? 'image' : 'raw',
        format: fileExt.replace('.', ''),
    };
};

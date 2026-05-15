
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';

// Filename sanitization
const sanitizeFilename = (filename: string): string => {
    // Remove path traversal attempts
    const basename = path.basename(filename);
    // Remove special characters except dots, dashes, and underscores
    return basename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp and random hash
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
        const sanitized = sanitizeFilename(file.originalname);
        const ext = path.extname(sanitized);
        const nameWithoutExt = path.basename(sanitized, ext);

        cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
        'application/pdf',
        'application/x-pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream',
        'image/jpeg',
        'image/png'
    ];

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();

    // Log the file details for debugging in case it fails
    logger.info(`Upload attempt: ${file.originalname} (MIME: ${file.mimetype})`);

    // Check both MIME type and extension, but allow octet-stream as a fallback if the extension is valid
    if (allowedExtensions.includes(ext) && (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('application/'))) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Uploaded: ${file.mimetype}. Allowed: ${allowedExtensions.join(', ')}`));
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1 // Only one file per request
    }
});

import { logger } from '../utils/logger';

// File cleanup utility
export const scheduleFileCleanup = async (filePath: string, delayMs: number = 24 * 60 * 60 * 1000) => {
    // Schedule file deletion after 24 hours if not referenced
    setTimeout(async () => {
        try {
            await fs.unlink(filePath);
            logger.info(`Cleaned up temporary file: ${filePath}`);
        } catch (error) {
            // Ignore error if file doesn't exist (might have been moved/deleted already)
            // console.error(`Failed to cleanup file: ${filePath}`, error);
        }
    }, delayMs);
};

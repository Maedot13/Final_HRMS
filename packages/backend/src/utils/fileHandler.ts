
import fs from 'fs';
import path from 'path';

export const deleteFile = (filePath: string): void => {
    try {
        const absolutePath = path.resolve(filePath);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
};

import { Request } from 'express';

export const getFileUrl = (req: Request, filename: string): string => {
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
};

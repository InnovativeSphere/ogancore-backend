import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync } from 'fs';

export interface UploadConfig {
  folder: string;          // subfolder inside UPLOAD_ROOT, e.g. 'kyc' or 'logos'
  allowedExtensions: string[];
  maxSizeBytes: number;
}

/**
 * Returns a Multer config object ready to pass into FileInterceptor.
 * Handles destination, filename uniqueness, extension whitelist, and size limit.
 */
export function buildUploadConfig(cfg: UploadConfig) {
  return {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const root = process.env.UPLOAD_ROOT || join(process.cwd(), 'uploads');
        const dir = join(root, cfg.folder);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const unique = randomBytes(8).toString('hex');
        const base = file.originalname
          .replace(ext, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 50);
        cb(null, `${Date.now()}_${unique}_${base}${ext}`);
      },
    }),
    fileFilter: (req: any, file: any, cb: any) => {
      const ext = extname(file.originalname).toLowerCase();
      if (!cfg.allowedExtensions.includes(ext)) {
        return cb(
          new BadRequestException(
            `Only ${cfg.allowedExtensions.join(', ')} allowed`,
          ),
          false,
        );
      }
      cb(null, true);
    },
    limits: { fileSize: cfg.maxSizeBytes },
  };
}
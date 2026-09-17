import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../../lib/errors.js';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
} else {
  console.warn('[Cloudinary] Warning: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET is missing. Uploads will fail until configured.');
}

const ALLOWED_FOLDERS = new Set([
  'stockpilot/products',
  'stockpilot/avatars',
  'stockpilot/branding',
  'stockpilot_uploads',
]);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function isBase64DataUrl(str: unknown): boolean {
  if (typeof str !== 'string') return false;
  const match = str.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  if (!match) return false;
  return ALLOWED_MIME_TYPES.has(match[1].toLowerCase());
}

export async function uploadImage(payload: { file?: string; image?: string; folder?: string }) {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError(500, 'Cloudinary storage is not configured on the server', 'CONFIGURATION_ERROR');
  }

  const fileData = payload.file || payload.image;
  if (!fileData || typeof fileData !== 'string') {
    throw new AppError(400, 'Image data is required', 'VALIDATION_ERROR');
  }

  const targetFolder = payload.folder || 'stockpilot_uploads';
  if (!ALLOWED_FOLDERS.has(targetFolder)) {
    throw new AppError(400, `Target folder '${targetFolder}' is not permitted`, 'VALIDATION_ERROR');
  }

  const trimmed = fileData.trim();
  const isBase64 = isBase64DataUrl(trimmed);
  const isHttps = trimmed.startsWith('https://');

  if (!isBase64 && !isHttps) {
    throw new AppError(400, 'Only secure HTTPS image URLs or JPEG/PNG/WEBP/GIF base64 images are supported', 'VALIDATION_ERROR');
  }

  try {
    const result = await cloudinary.uploader.upload(trimmed, {
      folder: targetFolder,
      resource_type: 'image',
    });

    return {
      url: result.secure_url || result.url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    };
  } catch (err: any) {
    console.error('Cloudinary upload error:', err?.message || err);
    throw new AppError(500, 'Failed to process and upload image securely', 'UPLOAD_ERROR');
  }
}

export async function ensureImageUrl(
  imageOrUrl: string | null | undefined,
  folder: string = 'stockpilot_uploads'
): Promise<string | null | undefined> {
  if (!imageOrUrl || typeof imageOrUrl !== 'string') {
    return imageOrUrl;
  }
  const trimmed = imageOrUrl.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }
  if (isBase64DataUrl(trimmed)) {
    try {
      const res = await uploadImage({ file: trimmed, folder });
      return res.url;
    } catch (e: any) {
      console.warn('Failed to upload image in ensureImageUrl:', e?.message || e);
      return trimmed;
    }
  }
  return trimmed;
}


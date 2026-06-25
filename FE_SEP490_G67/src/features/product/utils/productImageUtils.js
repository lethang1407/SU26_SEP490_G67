import { env } from '@/config/env';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

export function resolveProductImageUrl(path) {
    if (!path) {
        return null;
    }

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const apiBase = env.API_URL.replace(/\/api\/?$/, '');
    return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
}

export function validateProductImageFile(file) {
    if (!file) {
        return null;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return 'Chỉ hỗ trợ ảnh JPG hoặc PNG.';
    }

    if (file.size > MAX_IMAGE_SIZE) {
        return 'Ảnh không được vượt quá 5MB.';
    }

    return null;
}

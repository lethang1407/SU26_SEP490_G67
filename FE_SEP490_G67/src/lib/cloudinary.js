import { env } from '@/config/env';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

/**
 * Cấu hình Cloudinary cho unsigned upload từ FE.
 * Không dùng API Secret ở FE — chỉ cloud name + upload preset.
 */
export const cloudinaryConfig = {
    cloudName: env.CLOUDINARY_CLOUD_NAME?.trim() || '',
    uploadPreset: env.CLOUDINARY_UPLOAD_PRESET?.trim() || '',
};

export function isCloudinaryConfigured() {
    return Boolean(cloudinaryConfig.cloudName && cloudinaryConfig.uploadPreset);
}

/** Endpoint upload ảnh (unsigned). */
export function getCloudinaryUploadUrl() {
    if (!cloudinaryConfig.cloudName) {
        throw new Error('Chưa cấu hình VITE_APP_CLOUDINARY_CLOUD_NAME');
    }
    return `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
}

/**
 * Upload ảnh hóa đơn phiếu nhập (unsigned).
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadInvoiceImage(file) {
    if (!isCloudinaryConfigured()) {
        throw new Error(
            'Chưa cấu hình Cloudinary. Điền VITE_APP_CLOUDINARY_CLOUD_NAME và VITE_APP_CLOUDINARY_UPLOAD_PRESET rồi restart FE.',
        );
    }
    if (!file) {
        throw new Error('Chưa chọn file ảnh.');
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error('Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);

    const response = await fetch(getCloudinaryUploadUrl(), {
        method: 'POST',
        body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.error?.message || 'Upload ảnh lên Cloudinary thất bại.');
    }

    const url = data.secure_url || data.url;
    if (!url) {
        throw new Error('Cloudinary không trả về URL ảnh.');
    }

    return {
        url,
        publicId: data.public_id || '',
    };
}

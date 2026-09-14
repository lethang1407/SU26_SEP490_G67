const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

/**
 * Ảnh hóa đơn / sản phẩm được upload qua backend (CloudinaryImageService).
 * FE chỉ kiểm tra file trước khi gửi multipart.
 */
export function validateInvoiceImageFile(file) {
    if (!file) {
        throw new Error('Chưa chọn file ảnh.');
    }
    const filename = (file.name || '').toLowerCase();
    const validExt = filename.endsWith('.jpg')
        || filename.endsWith('.jpeg')
        || filename.endsWith('.png')
        || filename.endsWith('.webp');
    const validType = Boolean(file.type) && ALLOWED_TYPES.includes(file.type);
    if (!validType && !validExt) {
        throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error('Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.');
    }
}

export function isRemoteImageUrl(url) {
    return Boolean(url) && !String(url).startsWith('blob:') && !String(url).startsWith('data:');
}

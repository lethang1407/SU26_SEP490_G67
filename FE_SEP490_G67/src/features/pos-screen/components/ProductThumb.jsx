import { useState } from 'react';
import { Package } from 'lucide-react';

/**
 * Ảnh đại diện SP (imageUrl từ BE). Không có ảnh, hoặc ảnh lỗi (mất mạng khi đang
 * bán offline), thì hiện icon thay thế để dòng không bị lệch.
 */
export default function ProductThumb({ url, alt = '', size = 40 }) {
    const [failedUrl, setFailedUrl] = useState(null);
    const showImage = url && failedUrl !== url;

    return (
        <div className="product-thumb" style={{ width: size, height: size }}>
            {showImage ? (
                <img
                    src={url}
                    alt={alt}
                    loading="lazy"
                    onError={() => {
                        console.error('Failed to load product image:', url);
                        setFailedUrl(url);
                    }}
                />
            ) : (
                <Package size={Math.round(size * 0.5)} />
            )}
        </div>
    );
}

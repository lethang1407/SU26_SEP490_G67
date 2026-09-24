import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Package } from 'lucide-react';

const PREVIEW_WIDTH = 195;

/**
 * Ảnh đại diện SP (imageUrl từ BE). Không có ảnh, hoặc ảnh lỗi (mất mạng khi đang
 * bán offline), thì hiện icon thay thế để dòng không bị lệch.
 * preview: rê chuột hiện ảnh lớn bên cạnh, giống màn sản phẩm.
 */
export default function ProductThumb({ url, alt = '', size = 40, preview = false }) {
    const [failedUrl, setFailedUrl] = useState(null);
    const [hoverBox, setHoverBox] = useState(null);
    const thumbRef = useRef(null);
    const showImage = url && failedUrl !== url;

    const showPreview = (event) => {
        if (!preview || !showImage) return;
        const rect = (thumbRef.current || event.currentTarget).getBoundingClientRect();
        const fitsRight = rect.right + 10 + PREVIEW_WIDTH <= window.innerWidth - 8;
        setHoverBox({
            top: rect.top + rect.height / 2,
            left: fitsRight ? rect.right + 10 : Math.max(8, rect.left - 10 - PREVIEW_WIDTH),
        });
    };

    return (
        <div
            ref={thumbRef}
            className={`product-thumb${preview && showImage ? ' product-thumb--previewable' : ''}`}
            style={{ width: size, height: size }}
            onMouseEnter={showPreview}
            onMouseLeave={() => setHoverBox(null)}
        >
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
            {hoverBox
                ? createPortal(
                      <div
                          className="product-thumb-preview"
                          style={{ top: hoverBox.top, left: hoverBox.left }}
                      >
                          <img src={url} alt={alt} />
                      </div>,
                      document.body,
                  )
                : null}
        </div>
    );
}

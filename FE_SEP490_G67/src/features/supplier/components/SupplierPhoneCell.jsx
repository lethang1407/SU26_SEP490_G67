import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

function toTelHref(phoneNumber) {
    const digits = String(phoneNumber).replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : null;
}

export default function SupplierPhoneCell({ phoneNumber, stopRowClick = false }) {
    const [copied, setCopied] = useState(false);

    if (!phoneNumber) {
        return <span className="supplier-phone supplier-phone--empty">—</span>;
    }

    const telHref = toTelHref(phoneNumber);

    const stopIfNeeded = (event) => {
        if (stopRowClick) {
            event.stopPropagation();
        }
    };

    const handleCopy = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        try {
            await navigator.clipboard.writeText(String(phoneNumber));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            // Trình duyệt chặn clipboard — bỏ qua, vẫn giữ nút để thử lại.
        }
    };

    return (
        <span className="supplier-phone" onClick={stopIfNeeded}>
            {telHref ? (
                <a
                    href={telHref}
                    className="supplier-phone__link"
                    onClick={stopIfNeeded}
                    title="Gọi điện"
                    aria-label={`Gọi ${phoneNumber}`}
                >
                    {phoneNumber}
                </a>
            ) : (
                <span className="supplier-phone__text">{phoneNumber}</span>
            )}

            <button
                type="button"
                className={`supplier-phone__copy ${copied ? 'supplier-phone__copy--done' : ''}`}
                onClick={handleCopy}
                title={copied ? 'Đã sao chép' : 'Sao chép số điện thoại'}
                aria-label={copied ? 'Đã sao chép số điện thoại' : 'Sao chép số điện thoại'}
            >
                {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
        </span>
    );
}

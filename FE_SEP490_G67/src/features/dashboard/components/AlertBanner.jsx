import { useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function AlertBanner() {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className="alert-banner-v2" role="alert">
            <div className="alert-banner-v2_left">
                <AlertTriangle size={18} className="alert-banner-v2_icon" />
                <div>
                    <div className="alert-banner-v2_title">
                        3 sản phẩm đã hết hạn vẫn còn tồn kho
                    </div>
                    <div className="alert-banner-v2_desc">
                        Các sản phẩm hết hạn cần được kiểm tra và xử lý trước khi tiếp tục bán.
                    </div>
                </div>
            </div>
            <button
                className="alert-banner-v2_cta"
                onClick={() => setDismissed(true)}
            >
                Xử lý ngay <ArrowRight size={14} />
            </button>
        </div>
    );
}

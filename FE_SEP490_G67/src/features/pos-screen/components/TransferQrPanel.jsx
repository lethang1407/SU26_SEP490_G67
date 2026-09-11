import { useState } from 'react';
import { AlertCircle, Copy, Check, QrCode, Loader } from 'lucide-react';
import { formatVnd } from '../utils/money';
import { buildVietQrUrl, hasBankAccount } from '../utils/vietqr';

/**
 * Mã VietQR chuyển khoản, nằm thẳng trong cột thanh toán của POS.
 */
export default function TransferQrPanel({
    bank,
    bankLoading = false,
    bankError = null,
    amount = 0,
    reference = null,
    blockedReason = null,
}) {
    const [copied, setCopied] = useState(null);
    // Nhớ ĐƯỜNG DẪN đã hỏng chứ không phải cờ hỏng/không: đổi số tiền là đổi ảnh,
    // ảnh mới phải được thử lại chứ đừng để lần hỏng trước khóa luôn khung QR.
    const [failedUrl, setFailedUrl] = useState(null);

    const qrUrl = buildVietQrUrl(bank, amount, reference);
    const imageFailed = failedUrl != null && failedUrl === qrUrl;

    const handleCopy = async (value, field) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(field);
            setTimeout(() => setCopied(null), 1500);
        } catch (error) {
            // Trình duyệt chặn clipboard: số vẫn hiện trên màn hình để đọc tay.
            console.error("Failed to copy transfer info to clipboard:", error);
        }
    };

    if (blockedReason) {
        return (
            <div className="transfer-qr-block">
                <div className="transfer-qr-note transfer-qr-note--warn">
                    <AlertCircle size={16} />
                    <span>{blockedReason}</span>
                </div>
            </div>
        );
    }

    if (bankLoading) {
        return (
            <div className="transfer-qr-block">
                <div className="transfer-qr-placeholder">
                    <Loader size={20} className="transfer-qr-spin" />
                    <span>Đang tải thông tin chuyển khoản…</span>
                </div>
            </div>
        );
    }

    if (bankError || !hasBankAccount(bank)) {
        return (
            <div className="transfer-qr-block">
                <div className="transfer-qr-note transfer-qr-note--warn">
                    <AlertCircle size={16} />
                    <span>
                        {bankError
                            ?? 'Cửa hàng chưa khai báo tài khoản ngân hàng. '
                            + 'Vào Thông tin cửa hàng để thêm số tài khoản nhận chuyển khoản.'}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="transfer-qr-block">
            <div className="transfer-qr-head">
                <QrCode size={14} />
                Quét mã để chuyển khoản
            </div>

            <div className="transfer-qr-canvas-wrap">
                {imageFailed ? (
                    <div className="transfer-qr-canvas-fallback">
                        <AlertCircle size={22} />
                        <span>Không tải được ảnh mã QR.<br />Đọc số tài khoản bên dưới cho khách.</span>
                    </div>
                ) : (
                    <img
                        className="transfer-qr-image"
                        src={qrUrl}
                        alt="Mã VietQR chuyển khoản"
                        onError={() => setFailedUrl(qrUrl)}
                    />
                )}
            </div>

            <div className="transfer-qr-amount-line">
                <span>Số tiền trên mã</span>
                <strong>{formatVnd(Math.round(Number(amount) || 0))}</strong>
            </div>

            <div className="transfer-qr-bank">
                {bank.bankAccountName && (
                    <div className="transfer-qr-bank-row">
                        <span>Chủ tài khoản</span>
                        <strong>{bank.bankAccountName}</strong>
                    </div>
                )}
                <div className="transfer-qr-bank-row">
                    <span>Số tài khoản</span>
                    <strong className="transfer-qr-account">
                        {bank.bankAccountNo}
                        <button
                            type="button"
                            className="transfer-qr-copy"
                            onClick={() => handleCopy(bank.bankAccountNo, 'account')}
                            title="Sao chép số tài khoản"
                        >
                            {copied === 'account' ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                    </strong>
                </div>
                {reference && (
                    <div className="transfer-qr-bank-row">
                        <span>Nội dung</span>
                        <strong className="transfer-qr-account">
                            {reference}
                            <button
                                type="button"
                                className="transfer-qr-copy"
                                onClick={() => handleCopy(reference, 'reference')}
                                title="Sao chép nội dung chuyển khoản"
                            >
                                {copied === 'reference' ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                        </strong>
                    </div>
                )}
            </div>

            {/* Nói thẳng ranh giới trách nhiệm: máy không biết tiền đã về hay chưa. */}
            <div className="transfer-qr-note transfer-qr-note--hint">
                <AlertCircle size={16} />
                <span>Hãy kiểm tra trước khi xác nhận.</span>
            </div>
        </div>
    );
}

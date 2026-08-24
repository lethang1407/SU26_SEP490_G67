import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
    AlertCircle, CheckCircle2, Loader, RefreshCcw, Copy, Check, QrCode,
} from 'lucide-react';
import { formatVnd } from '../utils/money';

const STATUS_TEXT = {
    PROCESSING: 'Ngân hàng đang xử lý giao dịch…',
    PAID: 'Đã nhận đủ tiền',
    UNDERPAID: 'Khách chuyển thiếu tiền',
    CANCELLED: 'Giao dịch đã bị hủy',
    EXPIRED: 'Mã QR đã hết hạn',
    FAILED: 'Giao dịch thất bại',
};

/** Trạng thái không còn cứu được: phải dựng mã mới. */
const DEAD_STATUSES = ['CANCELLED', 'EXPIRED', 'FAILED'];

const QR_SIZE = 180;

/**
 * Mã QR chuyển khoản, nằm thẳng trong cột thanh toán của POS.
 *Hiện ngay khi thu ngân chọn "Chuyển khoản".
 */
export default function TransferQrPanel({
    session,
    opening = false,
    error = null,
    blockedReason = null,
    stale = false,
    settling = false,
    settleError = null,
    throttled = false,
    onRebuild,
    onRetrySettle,
}) {
    const canvasRef = useRef(null);
    const [renderError, setRenderError] = useState(null);
    const [copied, setCopied] = useState(false);

    const status = session?.status ?? null;
    const isDead = DEAD_STATUSES.includes(status);
    const isPaid = status === 'PAID';
    const rebuilding = opening || stale;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !session?.qrCode) return;
        QRCode.toCanvas(canvas, session.qrCode, { width: QR_SIZE, margin: 1 })
            .then(() => setRenderError(null))
            .catch(() => setRenderError('Không tạo được mã QR. Dùng số tài khoản bên dưới.'));
    }, [session?.qrCode]);

    const handleCopyAccount = async () => {
        if (!session?.accountNumber) return;
        try {
            await navigator.clipboard.writeText(session.accountNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Trình duyệt chặn clipboard
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

    if (!session) {
        return (
            <div className="transfer-qr-block">
                {error ? (
                    <>
                        <div className="transfer-qr-note transfer-qr-note--error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                        <button className="transfer-qr-inline-btn" onClick={onRebuild}>
                            <RefreshCcw size={14} />
                            Thử lại
                        </button>
                    </>
                ) : (
                    <div className="transfer-qr-placeholder">
                        <Loader size={20} className="transfer-qr-spin" />
                        <span>Đang tạo mã QR…</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="transfer-qr-block">
            <div className="transfer-qr-head">
                <QrCode size={14} />
                Quét mã để chuyển khoản
            </div>

            <div className={`transfer-qr-canvas-wrap${isPaid ? ' is-paid' : ''}${isDead || rebuilding ? ' is-dead' : ''}`}>
                <canvas ref={canvasRef} className="transfer-qr-canvas" />
                {(isPaid || isDead || rebuilding) && (
                    <div className="transfer-qr-canvas-veil">
                        {isPaid && <CheckCircle2 size={48} className="transfer-qr-veil-ok" />}
                        {!isPaid && isDead && <AlertCircle size={48} className="transfer-qr-veil-bad" />}
                        {!isPaid && !isDead && rebuilding && (
                            <div className="transfer-qr-veil-text">
                                <Loader size={20} className="transfer-qr-spin" />
                                <span>Đang cập nhật<br />số tiền mới…</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="transfer-qr-amount-line">
                <span>Số tiền trên mã</span>
                <strong>{formatVnd(Number(session.amount ?? 0))}</strong>
            </div>

            {renderError && (
                <div className="transfer-qr-note transfer-qr-note--warn">{renderError}</div>
            )}

            <div className="transfer-qr-bank">
                {session.accountName && (
                    <div className="transfer-qr-bank-row">
                        <span>Chủ tài khoản</span>
                        <strong>{session.accountName}</strong>
                    </div>
                )}
                {session.accountNumber && (
                    <div className="transfer-qr-bank-row">
                        <span>Số tài khoản</span>
                        <strong className="transfer-qr-account">
                            {session.accountNumber}
                            <button
                                type="button"
                                className="transfer-qr-copy"
                                onClick={handleCopyAccount}
                                title="Sao chép số tài khoản"
                            >
                                {copied ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                        </strong>
                    </div>
                )}
                {session.description && (
                    <div className="transfer-qr-bank-row">
                        <span>Nội dung</span>
                        <strong>{session.description}</strong>
                    </div>
                )}
            </div>

            {/* Hiển thị trạng thái mặc định khi customer quét QR */}
            {(settling || STATUS_TEXT[status]) && (
                <div className={`transfer-qr-status transfer-qr-status--${(status ?? 'pending').toLowerCase()}`}>
                    {isPaid && <CheckCircle2 size={15} />}
                    {isDead && <AlertCircle size={15} />}
                    <span>{settling ? 'Đã nhận tiền, đang ghi sổ…' : STATUS_TEXT[status]}</span>
                </div>
            )}

            {throttled && !isPaid && !isDead && (
                <div className="transfer-qr-note transfer-qr-note--warn">
                    <AlertCircle size={16} />
                    <span>Cổng thanh toán đang bận. Giao dịch của khách vẫn được ghi nhận.</span>
                </div>
            )}

            {status === 'UNDERPAID' && (
                <div className="transfer-qr-note transfer-qr-note--warn">
                    <AlertCircle size={16} />
                    <span>Khách chuyển thiếu. Đề nghị khách chuyển bổ sung, hoặc đổi sang hình thức khác.</span>
                </div>
            )}

            {settleError && (
                <div className="transfer-qr-note transfer-qr-note--error">
                    <AlertCircle size={16} />
                    <span>{settleError}</span>
                </div>
            )}

            {settleError && isPaid && (
                <button
                    className="transfer-qr-inline-btn transfer-qr-inline-btn--primary"
                    onClick={onRetrySettle}
                    disabled={settling}
                >
                    {settling ? 'ĐANG XỬ LÝ…' : 'GHI SỔ LẠI'}
                </button>
            )}

            {isDead && (
                <button className="transfer-qr-inline-btn transfer-qr-inline-btn--primary" onClick={onRebuild}>
                    <RefreshCcw size={14} />
                    Tạo mã QR mới
                </button>
            )}

        </div>
    );
}

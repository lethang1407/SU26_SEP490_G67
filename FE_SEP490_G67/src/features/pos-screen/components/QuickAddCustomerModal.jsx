import { useState, useEffect, useRef } from 'react';
import { UserPlus, X, AlertCircle, Loader } from 'lucide-react';
import { isVnPhone } from '../utils/validation';

export default function QuickAddCustomerModal({
    initialName = '',
    initialPhone = '',
    loading = false,
    error = null,
    onSubmit,
    onClose,
}) {
    const [name, setName] = useState(initialName);
    const [phone, setPhone] = useState(initialPhone);
    const [touched, setTouched] = useState(false);
    const nameRef = useRef(null);
    const phoneRef = useRef(null);

    useEffect(() => {
        const target = initialName ? phoneRef : nameRef;
        const timer = setTimeout(() => target.current?.focus(), 50);
        return () => clearTimeout(timer);
    }, [initialName]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !loading) onClose?.();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose, loading]);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const nameError = !trimmedName ? 'Vui lòng nhập họ tên khách hàng.' : null;
    // Số điện thoại để trống được — khách vãng lai không phải ai cũng cho số. Nhưng
    // đã nhập thì phải đúng định dạng, vì BE chặn bằng đúng regex này.
    const phoneError = trimmedPhone && !isVnPhone(trimmedPhone)
        ? 'Số điện thoại không hợp lệ.'
        : null;
    const canSubmit = !nameError && !phoneError && !loading;

    const handleSubmit = () => {
        setTouched(true);
        if (!canSubmit) return;
        onSubmit({
            fullName: trimmedName,
            // null chứ KHÔNG phải chuỗi rỗng: cột customers.phone_number có unique
            // index, nên khách thứ hai không có SĐT sẽ đâm lỗi trùng khóa. MySQL cho
            // phép nhiều NULL trong unique index, còn '' thì chỉ được một.
            phoneNumber: trimmedPhone || null,
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSubmit();
    };

    return (
        <div
            className="quick-add-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !loading) onClose?.();
            }}
        >
            <div className="quick-add-modal" role="dialog" aria-modal="true">
                <div className="quick-add-modal-header">
                    <span className="quick-add-modal-title">
                        <UserPlus size={16} />
                        Thêm khách hàng mới
                    </span>
                    <button
                        className="quick-add-close"
                        onClick={onClose}
                        disabled={loading}
                        title="Đóng"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="quick-add-modal-body">
                    <label className="quick-add-field">
                        <span className="quick-add-label">Họ và tên</span>
                        <input
                            ref={nameRef}
                            type="text"
                            maxLength={100}
                            autoComplete="off"
                            className={`quick-add-input${touched && nameError ? ' input-error' : ''}`}
                            placeholder="Nguyễn Văn A"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        {touched && nameError && (
                            <span className="quick-add-field-error">{nameError}</span>
                        )}
                    </label>

                    <label className="quick-add-field">
                        <span className="quick-add-label">
                            Số điện thoại <span className="quick-add-optional">(không bắt buộc)</span>
                        </span>
                        <input
                            ref={phoneRef}
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            autoComplete="off"
                            className={`quick-add-input${touched && phoneError ? ' input-error' : ''}`}
                            placeholder="0912345678"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        {touched && phoneError && (
                            <span className="quick-add-field-error">{phoneError}</span>
                        )}
                    </label>

                    {error && (
                        <div className="quick-add-error">
                            <AlertCircle size={13} /> {error}
                        </div>
                    )}
                </div>

                <div className="quick-add-modal-footer">
                    <button
                        className="quick-add-btn quick-add-btn--ghost"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Hủy
                    </button>
                    <button
                        className="quick-add-btn quick-add-btn--primary"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading
                            ? <><Loader size={15} className="spin-icon" /> Đang lưu...</>
                            : 'Thêm vào đơn'}
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    User,
    Phone,
    Lock,
    KeyRound,
    Eye,
    EyeOff,
    ShieldCheck,
    Save,
    AlertCircle,
    CheckCircle2,
    Loader2,
} from 'lucide-react';
import { getStaffById, updateStaff } from '../api';
import { getStaffRoleTemplate } from '../../permission/constants/permissionDictionary';
import { getApiErrorMessage } from '../../../utils/api-utils';
import '../../../css/StaffDetailModal.css';

export default function StaffDetailModal({
    show,
    staffId,
    initialStaff,
    onHide,
    onRefresh,
    onOpenPermissions,
}) {
    const [staff, setStaff] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [submitError, setSubmitError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    const [form, setForm] = useState({
        fullName: '',
        phone: '',
        username: '',
        password: '',
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    const modalRef = useRef(null);

    useEffect(() => {
        if (!show) {
            setStaff(null);
            setError(null);
            setSubmitError(null);
            setSuccessMsg(null);
            setErrors({});
            setShowPassword(false);
            return;
        }

        let isCancelled = false;

        const fetchDetail = async () => {
            if (!staffId && !initialStaff?.id) return;
            const targetId = staffId || initialStaff.id;

            setLoading(true);
            setError(null);
            setSubmitError(null);
            setSuccessMsg(null);

            try {
                const data = await getStaffById(targetId);
                if (!isCancelled) {
                    const mergedData = {
                        ...data,
                        permissions: data.permissions || initialStaff?.permissions || [],
                    };
                    setStaff(mergedData);
                    setForm({
                        fullName: mergedData.name || '',
                        phone: mergedData.phone || '',
                        username: mergedData.username || '',
                        password: '',
                    });
                }
            } catch (err) {
                if (!isCancelled) {
                    // Fallback to initialStaff if available
                    if (initialStaff) {
                        setStaff(initialStaff);
                        setForm({
                            fullName: initialStaff.name || '',
                            phone: initialStaff.phone || '',
                            username: initialStaff.username || '',
                            password: '',
                        });
                    } else {
                        setError(getApiErrorMessage(err, 'Không thể tải thông tin nhân viên.'));
                    }
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };

        fetchDetail();

        return () => {
            isCancelled = true;
        };
    }, [show, staffId, initialStaff]);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && show && !submitting) {
                onHide?.();
            }
        };
        if (show) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [show, submitting, onHide]);

    const roleTemplate = useMemo(() => {
        return getStaffRoleTemplate(staff?.permissions || initialStaff?.permissions || []);
    }, [staff, initialStaff]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
        if (submitError) setSubmitError(null);
    };

    const validate = () => {
        const errs = {};
        if (!form.fullName?.trim()) {
            errs.fullName = 'Họ và tên không được để trống.';
        }
        if (!form.phone?.trim()) {
            errs.phone = 'Số điện thoại không được để trống.';
        } else if (!/^[0-9+ ]{8,15}$/.test(form.phone.trim())) {
            errs.phone = 'Số điện thoại không đúng định dạng.';
        }
        if (form.password && form.password.trim().length < 6) {
            errs.password = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        setSubmitError(null);
        setSuccessMsg(null);

        const targetId = staff?.id || staffId || initialStaff?.id;
        const payload = {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            username: form.username.trim(),
            roles: staff?.roles || initialStaff?.roles || ['cashier'],
        };

        if (form.password?.trim()) {
            payload.password = form.password.trim();
        }

        try {
            await updateStaff(targetId, payload);
            setSuccessMsg('Cập nhật thông tin nhân viên thành công!');
            onRefresh?.();
            setTimeout(() => {
                onHide?.();
            }, 500);
        } catch (err) {
            setSubmitError(getApiErrorMessage(err, 'Không thể cập nhật nhân viên. Vui lòng thử lại.'));
        } finally {
            setSubmitting(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'NV';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    if (!show) return null;

    return createPortal(
        <div
            className="staff-detail-modal-overlay"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget && !submitting) {
                    onHide?.();
                }
            }}
        >
            <div
                ref={modalRef}
                className="staff-detail-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="staff-detail-title"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="staff-detail-modal-header">
                    <div className="staff-detail-header-left">
                        <div className="staff-detail-avatar">
                            {getInitials(form.fullName || staff?.name)}
                        </div>
                        <div>
                            <h2 id="staff-detail-title" className="staff-detail-title">
                                {form.fullName || staff?.name || 'Chi tiết nhân viên'}
                            </h2>
                            <p className="staff-detail-subtitle">
                                <span>@{form.username || staff?.username || 'nhanvien'}</span>
                                {staff?.id && <span>· Mã: #{staff.id}</span>}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="staff-detail-close-btn"
                        onClick={onHide}
                        disabled={submitting}
                        aria-label="Đóng modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                {loading ? (
                    <div className="staff-detail-loading">
                        <Loader2 size={32} className="animate-spin text-primary" />
                        <span>Đang tải thông tin nhân viên...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="staff-detail-modal-body">
                            {/* Error / Success Notifications */}
                            {error && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertCircle size={16} className="flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                            {submitError && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertCircle size={16} className="flex-shrink-0" />
                                    <span>{submitError}</span>
                                </div>
                            )}
                            {successMsg && (
                                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '10px 14px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <CheckCircle2 size={16} className="flex-shrink-0" />
                                    <span>{successMsg}</span>
                                </div>
                            )}

                            {/* Role & Permission Quick Banner */}
                            <div className="staff-detail-role-banner">
                                <div className="staff-detail-role-info">
                                    <span
                                        className={`staff-role-badge ${roleTemplate.badgeClass || ''}`}
                                        style={{
                                            backgroundColor: roleTemplate.bg,
                                            color: roleTemplate.color,
                                            borderColor: roleTemplate.borderColor,
                                        }}
                                        title={`Mẫu phân quyền: ${roleTemplate.name}`}
                                    >
                                        <ShieldCheck size={14} className="flex-shrink-0" />
                                        <span>{roleTemplate.name}</span>
                                    </span>
                                </div>
                                {onOpenPermissions && staff && (
                                    <button
                                        type="button"
                                        className="staff-detail-perm-link-btn"
                                        onClick={() => {
                                            onHide?.();
                                            onOpenPermissions?.(staff);
                                        }}
                                        title="Chỉnh sửa chi tiết quyền hạn cho nhân viên"
                                    >
                                        <KeyRound size={13} />
                                        <span>Phân quyền chi tiết</span>
                                    </button>
                                )}
                            </div>

                            {/* Field: Họ và tên */}
                            <div className="staff-detail-form-group">
                                <label className="staff-detail-label" htmlFor="staff_fullName">
                                    <span>
                                        Họ và tên <span className="required-star">*</span>
                                    </span>
                                </label>
                                <div className="staff-detail-input-wrap">
                                    <User size={16} className="staff-detail-input-icon" />
                                    <input
                                        id="staff_fullName"
                                        name="fullName"
                                        type="text"
                                        className={`staff-detail-input ${errors.fullName ? 'staff-detail-input--error' : ''}`}
                                        placeholder="Nhập họ và tên đầy đủ"
                                        value={form.fullName}
                                        onChange={handleChange}
                                        disabled={submitting}
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.fullName && (
                                    <span className="staff-detail-field-error">{errors.fullName}</span>
                                )}
                            </div>

                            {/* Field: Số điện thoại */}
                            <div className="staff-detail-form-group">
                                <label className="staff-detail-label" htmlFor="staff_phone">
                                    <span>
                                        Số điện thoại <span className="required-star">*</span>
                                    </span>
                                </label>
                                <div className="staff-detail-input-wrap">
                                    <Phone size={16} className="staff-detail-input-icon" />
                                    <input
                                        id="staff_phone"
                                        name="phone"
                                        type="tel"
                                        className={`staff-detail-input ${errors.phone ? 'staff-detail-input--error' : ''}`}
                                        placeholder="Ví dụ: 0901 234 567"
                                        value={form.phone}
                                        onChange={handleChange}
                                        disabled={submitting}
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.phone && (
                                    <span className="staff-detail-field-error">{errors.phone}</span>
                                )}
                            </div>

                            {/* Field: Tên đăng nhập (Read-only) */}
                            <div className="staff-detail-form-group">
                                <label className="staff-detail-label" htmlFor="staff_username">
                                    <span>Tên đăng nhập</span>
                                    <span className="label-hint">Không thể thay đổi</span>
                                </label>
                                <div className="staff-detail-input-wrap">
                                    <Lock size={16} className="staff-detail-input-icon" />
                                    <input
                                        id="staff_username"
                                        name="username"
                                        type="text"
                                        className="staff-detail-input staff-detail-input--readonly"
                                        value={form.username}
                                        readOnly
                                        disabled
                                    />
                                </div>
                            </div>

                            {/* Field: Mật khẩu mới (Optional) */}
                            <div className="staff-detail-form-group">
                                <label className="staff-detail-label" htmlFor="staff_password">
                                    <span>Mật khẩu mới</span>
                                    <span className="label-hint">Để trống nếu không đổi</span>
                                </label>
                                <div className="staff-detail-input-wrap">
                                    <KeyRound size={16} className="staff-detail-input-icon" />
                                    <input
                                        id="staff_password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        className={`staff-detail-input ${errors.password ? 'staff-detail-input--error' : ''}`}
                                        placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                                        value={form.password}
                                        onChange={handleChange}
                                        disabled={submitting}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="staff-detail-toggle-pw"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.password ? (
                                    <span className="staff-detail-field-error">{errors.password}</span>
                                ) : (
                                    <span className="staff-detail-field-desc">
                                        Chỉ điền vào ô này nếu bạn muốn đặt lại mật khẩu cho nhân viên.
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="staff-detail-modal-footer">
                            <button
                                type="button"
                                className="staff-detail-btn staff-detail-btn--cancel"
                                onClick={onHide}
                                disabled={submitting}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="staff-detail-btn staff-detail-btn--primary"
                                disabled={submitting || loading}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Đang lưu...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={15} />
                                        <span>Lưu thay đổi</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body,
    );
}

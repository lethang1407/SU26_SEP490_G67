import { useEffect, useState } from 'react';
import {
    BarChart3,
    Eye,
    EyeOff,
    KeyRound,
    Lock,
    Package,
    ShoppingCart,
    User,
    Warehouse,
} from 'lucide-react';
import { DEFAULT_PERMISSIONS, STAFF_PERMISSIONS, SYSTEM_ROLES } from '../constants';

const PERMISSION_ICONS = {
    ShoppingCart,
    Package,
    Warehouse,
    BarChart3,
};

const EMPTY_FORM = {
    fullName: '',
    phone: '',
    username: '',
    password: '',
    systemRole: 'staff',
};

function mapStaffToForm(staff) {
    if (!staff) {
        return EMPTY_FORM;
    }

    return {
        fullName: staff.name ?? '',
        phone: staff.phone ?? '',
        username: staff.username ?? '',
        password: staff.password ?? '',
        systemRole: staff.systemRole ?? SYSTEM_ROLES[0].value,
    };
}

export default function StaffInfoForm({
    formId,
    initialData,
    isNewStaff = false,
    isSubmitting = false,
    saveButtonLabel = 'Lưu',
    onSubmit,
    onCancel,
}) {
    const [form, setForm] = useState(() => mapStaffToForm(initialData));
    const [permissions, setPermissions] = useState(
        initialData?.permissions ?? DEFAULT_PERMISSIONS
    );
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        setForm(mapStaffToForm(initialData));
        setPermissions(initialData?.permissions ?? DEFAULT_PERMISSIONS);
        setErrors({});
    }, [initialData]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const togglePermission = (permissionId) => {
        setPermissions((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const validateForm = () => {
        const nextErrors = {};

        if (!form.fullName.trim()) {
            nextErrors.fullName = 'Vui lòng nhập họ và tên.';
        }
        if (!form.phone.trim()) {
            nextErrors.phone = 'Vui lòng nhập số điện thoại.';
        }
        if (!form.username.trim()) {
            nextErrors.username = 'Vui lòng nhập tên đăng nhập.';
        }
        if (isNewStaff && !form.password.trim()) {
            nextErrors.password = 'Vui lòng nhập mật khẩu.';
        }
        if (permissions.length === 0) {
            nextErrors.permissions = 'Vui lòng chọn ít nhất một quyền truy cập.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        onSubmit?.({
            ...form,
            permissions,
        });
    };

    return (
        <form id={formId} className="add-staff-form" onSubmit={handleSubmit} noValidate>
            <div className="add-staff-layout">
                <div className="add-staff-main">
                    <section className="add-staff-card">
                        <header className="add-staff-card__header">
                            <span className="add-staff-card__icon add-staff-card__icon--user">
                                <User size={18} />
                            </span>
                            <h2 className="add-staff-card__title">Thông tin cá nhân</h2>
                        </header>
                        <div className="add-staff-fields add-staff-fields--two-col">
                            <div className="add-staff-field">
                                <label className="add-staff-field__label" htmlFor="fullName">
                                    Họ và tên <span className="add-staff-field__required">*</span>
                                </label>
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    className={`add-staff-field__input${errors.fullName ? ' add-staff-field__input--error' : ''}`}
                                    placeholder="Nhập họ tên đầy đủ"
                                    value={form.fullName}
                                    onChange={handleChange}
                                />
                                {errors.fullName && (
                                    <span className="add-staff-field__error">{errors.fullName}</span>
                                )}
                            </div>
                            <div className="add-staff-field">
                                <label className="add-staff-field__label" htmlFor="phone">
                                    Số điện thoại <span className="add-staff-field__required">*</span>
                                </label>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    className={`add-staff-field__input${errors.phone ? ' add-staff-field__input--error' : ''}`}
                                    placeholder="090x xxx xxx"
                                    value={form.phone}
                                    onChange={handleChange}
                                />
                                {errors.phone && (
                                    <span className="add-staff-field__error">{errors.phone}</span>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="add-staff-card">
                        <header className="add-staff-card__header">
                            <span className="add-staff-card__icon add-staff-card__icon--lock">
                                <Lock size={18} />
                            </span>
                            <h2 className="add-staff-card__title">Thông tin tài khoản</h2>
                        </header>
                        <div className="add-staff-fields add-staff-fields--two-col">
                            <div className="add-staff-field">
                                <label className="add-staff-field__label" htmlFor="username">
                                    Tên đăng nhập <span className="add-staff-field__required">*</span>
                                </label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    className={`add-staff-field__input${errors.username ? ' add-staff-field__input--error' : ''}`}
                                    placeholder="nv.nguyenvan"
                                    value={form.username}
                                    onChange={handleChange}
                                />
                                {errors.username && (
                                    <span className="add-staff-field__error">{errors.username}</span>
                                )}
                            </div>
                            <div className="add-staff-field">
                                <label className="add-staff-field__label" htmlFor="password">
                                    Mật khẩu{' '}
                                    {isNewStaff && (
                                        <span className="add-staff-field__required">*</span>
                                    )}
                                </label>
                                <div className="add-staff-field__password">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        className={`add-staff-field__input${errors.password ? ' add-staff-field__input--error' : ''}`}
                                        placeholder={isNewStaff ? '********' : 'Để trống nếu không đổi'}
                                        value={form.password}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="add-staff-field__toggle-password"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <span className="add-staff-field__error">{errors.password}</span>
                                )}
                            </div>
                        </div>
                        <div className="add-staff-field add-staff-field--full">
                            <label className="add-staff-field__label" htmlFor="systemRole">
                                Vai trò hệ thống
                            </label>
                            <select
                                id="systemRole"
                                name="systemRole"
                                className="add-staff-field__select"
                                value={form.systemRole}
                                onChange={handleChange}
                            >
                                {SYSTEM_ROLES.map((role) => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                            <p className="add-staff-field__hint">
                                Vai trò này xác định phạm vi truy cập mặc định của nhân viên.
                            </p>
                        </div>
                    </section>
                </div>

                <aside className="add-staff-sidebar">
                    <section className="add-staff-card add-staff-card--permissions">
                        <header className="add-staff-card__header">
                            <span className="add-staff-card__icon add-staff-card__icon--key">
                                <KeyRound size={18} />
                            </span>
                            <h2 className="add-staff-card__title">Quyền hạn chi tiết</h2>
                        </header>
                        <ul className="add-staff-permissions">
                            {STAFF_PERMISSIONS.map((permission) => {
                                const IconComponent = PERMISSION_ICONS[permission.icon];
                                const isChecked = permissions.includes(permission.id);

                                return (
                                    <li key={permission.id}>
                                        <label
                                            className={`add-staff-permission${isChecked ? ' add-staff-permission--checked' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="add-staff-permission__checkbox"
                                                checked={isChecked}
                                                onChange={() => togglePermission(permission.id)}
                                            />
                                            <span className="add-staff-permission__content">
                                                <span className="add-staff-permission__title">
                                                    {permission.title}
                                                </span>
                                                <span className="add-staff-permission__desc">
                                                    {permission.description}
                                                </span>
                                            </span>
                                            <span
                                                className="add-staff-permission__icon"
                                                style={{
                                                    color: permission.color,
                                                    backgroundColor: permission.bgColor,
                                                }}
                                            >
                                                <IconComponent size={20} />
                                            </span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                        {errors.permissions && (
                            <span className="add-staff-field__error">{errors.permissions}</span>
                        )}
                    </section>
                </aside>
            </div>

            <div className="add-staff-actions">
                <button
                    type="button"
                    className="add-staff-action-btn add-staff-action-btn--outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    className="add-staff-action-btn add-staff-action-btn--primary"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Đang lưu...' : saveButtonLabel}
                </button>
            </div>
        </form>
    );
}

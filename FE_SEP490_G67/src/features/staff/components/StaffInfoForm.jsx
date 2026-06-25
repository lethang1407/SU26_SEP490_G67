import { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { DEFAULT_STAFF_ROLES, STAFF_ROLES } from '../constants';

const EMPTY_FORM = {
    fullName: '',
    phone: '',
    username: '',
    password: '',
};

function normalizeRoles(roles) {
    const allowedValues = STAFF_ROLES.map((role) => role.value);

    return (roles ?? DEFAULT_STAFF_ROLES)
        .map((role) => role.toLowerCase())
        .filter((role, index, array) => allowedValues.includes(role) && array.indexOf(role) === index);
}

function mapStaffToForm(staff) {
    if (!staff) {
        return {
            ...EMPTY_FORM,
            roles: [...DEFAULT_STAFF_ROLES],
        };
    }

    return {
        fullName: staff.name ?? '',
        phone: staff.phone ?? '',
        username: staff.username ?? '',
        password: '',
        roles: normalizeRoles(staff.roles),
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
    const [roles, setRoles] = useState(() => mapStaffToForm(initialData).roles);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const mapped = mapStaffToForm(initialData);
        setForm(mapped);
        setRoles(mapped.roles);
        setErrors({});
    }, [initialData]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const toggleRole = (roleValue) => {
        setRoles((prev) =>
            prev.includes(roleValue)
                ? prev.filter((value) => value !== roleValue)
                : [...prev, roleValue],
        );
        setErrors((prev) => ({ ...prev, roles: null }));
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
        if (roles.length === 0) {
            nextErrors.roles = 'Vui lòng chọn ít nhất một vai trò.';
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
            roles,
        });
    };

    return (
        <form id={formId} className="add-staff-form" onSubmit={handleSubmit} noValidate>
            <div className="add-staff-main add-staff-main--full">
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
                        <span className="add-staff-field__label">
                            Vai trò hệ thống <span className="add-staff-field__required">*</span>
                        </span>
                        <p className="add-staff-field__hint">
                            Chọn một hoặc nhiều vai trò cho nhân viên.
                        </p>
                        <ul className="add-staff-roles">
                            {STAFF_ROLES.map((role) => {
                                const isChecked = roles.includes(role.value);

                                return (
                                    <li key={role.value}>
                                        <label
                                            className={`add-staff-role${isChecked ? ' add-staff-role--checked' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="add-staff-role__checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleRole(role.value)}
                                            />
                                            <span className="add-staff-role__label">{role.label}</span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                        {errors.roles && (
                            <span className="add-staff-field__error">{errors.roles}</span>
                        )}
                    </div>
                </section>
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

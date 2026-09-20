import { useEffect, useMemo, useState } from 'react';
import {
    Eye,
    EyeOff,
    Lock,
    User,
    ShieldCheck,
    ShoppingCart,
    Package,
    Calculator,
    ShieldAlert,
    LockKeyhole,
    Info,
} from 'lucide-react';
import { DEFAULT_STAFF_ROLES, STAFF_ROLES } from '../constants';
import { ROLE_TEMPLATES, PERMISSION_DICTIONARY } from '../../permission/constants/permissionDictionary';

const EMPTY_FORM = {
    fullName: '',
    phone: '',
    username: '',
    password: '',
};

const QUICK_ROLE_OPTIONS = [
    {
        id: 'CASHIER',
        name: 'Bán hàng & Thu ngân (POS)',
        description: 'Quét mã vạch sản phẩm, tính tiền tại quầy, in hóa đơn và xử lý đổi trả hàng.',
        isMandatory: true,
        theme: 'blue',
        icon: ShoppingCart,
        featureTags: ['Bán hàng POS', 'Đổi/trả hàng', 'In hóa đơn', 'Xem đơn của mình'],
    },
    {
        id: 'WAREHOUSE_STAFF',
        name: 'Quản lý Kho & Nhập hàng',
        description: 'Quản lý danh mục hàng hóa, vị trí kệ kho, kiểm kê tồn kho và tạo đơn nhập.',
        isMandatory: false,
        theme: 'emerald',
        icon: Package,
        featureTags: ['Quản lý sản phẩm', 'Vị trí kệ kho', 'Kiểm kê kho', 'Tạo đơn nhập hàng'],
    },
    {
        id: 'ACCOUNTANT',
        name: 'Kế toán, Sổ nợ & Đối soát',
        description: 'Quản lý danh sách khách hàng nợ, thu nợ, thanh toán cho NCC và xem đối soát ca bán.',
        isMandatory: false,
        theme: 'purple',
        icon: Calculator,
        featureTags: ['Sổ nợ khách hàng', 'Thanh toán NCC', 'Xem tất cả đơn bán', 'Đối soát doanh thu'],
    },
    {
        id: 'FULL_ACCESS',
        name: 'Quản lý ca / Toàn quyền',
        description: 'Cấp toàn bộ 32 quyền hạn quản lý nghiệp vụ và cấu hình cửa hàng cho nhân viên tin cậy.',
        isMandatory: false,
        theme: 'amber',
        icon: ShieldAlert,
        featureTags: ['Toàn quyền tất cả 6 phân hệ'],
    },
];

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
    const [selectedRoleTemplates, setSelectedRoleTemplates] = useState(() => new Set(['CASHIER']));

    useEffect(() => {
        const mapped = mapStaffToForm(initialData);
        setForm(mapped);
        setRoles(mapped.roles);
        setErrors({});
    }, [initialData]);

    const effectivePermissions = useMemo(() => {
        const permSet = new Set(ROLE_TEMPLATES.find((t) => t.id === 'CASHIER')?.permissions || []);
        if (selectedRoleTemplates.has('FULL_ACCESS')) {
            Object.keys(PERMISSION_DICTIONARY).forEach((p) => permSet.add(p));
        } else {
            selectedRoleTemplates.forEach((roleId) => {
                const tpl = ROLE_TEMPLATES.find((t) => t.id === roleId);
                if (tpl) {
                    tpl.permissions.forEach((p) => permSet.add(p));
                }
            });
        }
        return Array.from(permSet);
    }, [selectedRoleTemplates]);

    const handleToggleRoleTemplate = (templateId) => {
        if (templateId === 'CASHIER') return; // Không được tắt vai trò bán hàng

        setSelectedRoleTemplates((prev) => {
            const next = new Set(prev);
            if (templateId === 'FULL_ACCESS') {
                if (next.has('FULL_ACCESS')) {
                    next.delete('FULL_ACCESS');
                } else {
                    next.add('FULL_ACCESS');
                    next.add('WAREHOUSE_STAFF');
                    next.add('ACCOUNTANT');
                }
            } else {
                if (next.has(templateId)) {
                    next.delete(templateId);
                    next.delete('FULL_ACCESS');
                } else {
                    next.add(templateId);
                    if (next.has('WAREHOUSE_STAFF') && next.has('ACCOUNTANT')) {
                        next.add('FULL_ACCESS');
                    }
                }
            }
            next.add('CASHIER');
            return next;
        });
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: null }));
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
            permissions: isNewStaff ? effectivePermissions : undefined,
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
                                className={`add-staff-field__input${errors.username ? ' add-staff-field__input--error' : ''}${!isNewStaff ? ' add-staff-field__input--readonly' : ''}`}
                                placeholder="nv.nguyenvan"
                                value={form.username}
                                onChange={handleChange}
                                readOnly={!isNewStaff}
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
                </section>

                {/* Phân quyền nhanh cho nhân viên mới */}
                {isNewStaff && (
                    <section className="add-staff-card add-staff-card--permissions">
                        <header className="add-staff-card__header add-staff-card__header--perm">
                            <div className="add-staff-perm-head-left">
                                <span className="add-staff-card__icon add-staff-card__icon--perm">
                                    <ShieldCheck size={18} />
                                </span>
                                <div>
                                    <h2 className="add-staff-card__title">Phân quyền nhanh theo vai trò</h2>
                                    <p className="add-staff-card__subtitle">
                                        Tích chọn các vai trò để cấp quyền tương ứng cho nhân viên ngay khi tạo tài khoản.
                                    </p>
                                </div>
                            </div>
                            <div className="add-staff-perm-count-badge">
                                Đang cấp: <strong>{effectivePermissions.length} / {Object.keys(PERMISSION_DICTIONARY).length}</strong> quyền
                            </div>
                        </header>

                        <div className="add-staff-role-templates-grid">
                            {QUICK_ROLE_OPTIONS.map((item) => {
                                const isSelected = selectedRoleTemplates.has(item.id);
                                const isMandatory = item.isMandatory;
                                const IconComponent = item.icon;

                                return (
                                    <div
                                        key={item.id}
                                        className={`add-staff-role-card ${isSelected ? 'is-selected' : ''} ${isMandatory ? 'is-mandatory' : ''}`}
                                        onClick={() => !isMandatory && handleToggleRoleTemplate(item.id)}
                                    >
                                        <div className="add-staff-role-card__left">
                                            <div className={`add-staff-role-card__icon-box add-staff-role-card__icon-box--${item.theme}`}>
                                                <IconComponent size={20} />
                                            </div>
                                            <div className="add-staff-role-card__info">
                                                <div className="add-staff-role-card__title-row">
                                                    <span className="add-staff-role-card__name">{item.name}</span>
                                                    {isMandatory && (
                                                        <span className="add-staff-role-card__badge-mandatory" title="Vai trò bán hàng mặc định luôn được cấp cho nhân viên, không thể tắt">
                                                            <LockKeyhole size={11} /> Bắt buộc
                                                        </span>
                                                    )}
                                                    {item.id === 'FULL_ACCESS' && (
                                                        <span className="add-staff-role-card__badge-all">Toàn bộ quyền</span>
                                                    )}
                                                </div>
                                                <p className="add-staff-role-card__desc">{item.description}</p>
                                                <div className="add-staff-role-card__perms-preview">
                                                    {item.featureTags.map((tag, tIdx) => (
                                                        <span key={tIdx} className="add-staff-role-card__pill">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="add-staff-role-card__check-wrap">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={isMandatory}
                                                onChange={() => !isMandatory && handleToggleRoleTemplate(item.id)}
                                                className="add-staff-role-card__checkbox"
                                                aria-label={`Chọn vai trò ${item.name}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="add-staff-perm-note">
                            <Info size={15} className="flex-shrink-0" />
                            <span>
                                <strong>Lưu ý:</strong> Vai trò <strong>Bán hàng & Thu ngân (POS)</strong> là vai trò cơ bản mặc định luôn được bật. Sau khi tạo xong, Quản lý vẫn có thể vào mục <strong>"Phân quyền"</strong> ở danh sách nhân viên để bật/tắt chi tiết từng quyền lẻ nếu muốn.
                            </span>
                        </div>
                    </section>
                )}
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


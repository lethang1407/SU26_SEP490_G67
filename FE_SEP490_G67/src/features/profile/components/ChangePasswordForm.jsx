import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { changePassword } from '../api';
import { PROFILE_ROUTES } from '../constants';
import { getApiErrorMessage } from '../utils/profileUtils';
import { PASSWORD_POLICY_HINT, validateChangePasswordForm } from '../utils/passwordUtils';

const INITIAL_FORM = {
	currentPassword: '',
	newPassword: '',
	confirmNewPassword: '',
};

export default function ChangePasswordForm({
	username = '',
	formId = 'change-password-form',
	hideActions = false,
	onSavingChange,
}) {
	const navigate = useNavigate();
	const [form, setForm] = useState(INITIAL_FORM);
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState(null);
	const [visibleFields, setVisibleFields] = useState({
		currentPassword: false,
		newPassword: false,
		confirmNewPassword: false,
	});

	const handleChange = (e) => {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
		setErrors((prev) => ({ ...prev, [name]: null }));
		setMessage(null);
	};

	const toggleVisibility = (field) => {
		setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		const nextErrors = validateChangePasswordForm(form, username);
		if (Object.keys(nextErrors).length > 0) {
			setErrors(nextErrors);
			return;
		}

		setSaving(true);
		onSavingChange?.(true);
		setMessage(null);

		try {
			await changePassword({
				currentPassword: form.currentPassword,
				newPassword: form.newPassword,
				confirmNewPassword: form.confirmNewPassword,
			});

			navigate(PROFILE_ROUTES.view, {
				replace: true,
				state: { message: 'Đổi mật khẩu thành công.' },
			});
		} catch (err) {
			setMessage({
				type: 'error',
				text: getApiErrorMessage(err, 'Không thể đổi mật khẩu. Vui lòng thử lại.'),
			});
		} finally {
			setSaving(false);
			onSavingChange?.(false);
		}
	};

	const renderPasswordField = (id, name, label, placeholder) => (
		<div className="profile-edit-form__field">
			<label htmlFor={id}>{label}</label>
			<div className="profile-edit-form__input-wrap">
				<input
					id={id}
					name={name}
					type={visibleFields[name] ? 'text' : 'password'}
					value={form[name]}
					onChange={handleChange}
					placeholder={placeholder}
					autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
					className={`profile-edit-form__input${errors[name] ? ' profile-edit-form__input--error' : ''}`}
				/>
				<button
					type="button"
					className="profile-edit-form__toggle"
					onClick={() => toggleVisibility(name)}
					aria-label={visibleFields[name] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
				>
					{visibleFields[name] ? <EyeOff size={18} /> : <Eye size={18} />}
				</button>
			</div>
			{errors[name] && (
				<span className="profile-edit-form__error">{errors[name]}</span>
			)}
		</div>
	);

	return (
		<div className="profile-edit-card">
			<div className="profile-edit-card__header">
				<h2 className="profile-edit-card__title">Đổi mật khẩu</h2>
				<p className="profile-edit-form__hint profile-change-password__desc">
					{PASSWORD_POLICY_HINT}
				</p>
			</div>
			<form
				id={formId}
				className="profile-edit-form"
				onSubmit={handleSubmit}
				noValidate
			>
				{renderPasswordField(
					'currentPassword',
					'currentPassword',
					'Mật khẩu hiện tại',
					'Nhập mật khẩu hiện tại',
				)}
				{renderPasswordField(
					'newPassword',
					'newPassword',
					'Mật khẩu mới',
					'Nhập mật khẩu mới',
				)}
				{renderPasswordField(
					'confirmNewPassword',
					'confirmNewPassword',
					'Xác nhận mật khẩu mới',
					'Nhập lại mật khẩu mới',
				)}

				{message && (
					<p className={`profile-edit-form__message profile-edit-form__message--${message.type}`}>
						{message.text}
					</p>
				)}

				{!hideActions && (
					<div className="profile-edit-form__actions">
						<button
							type="button"
							className="profile-action-btn profile-action-btn--outline"
							onClick={() => navigate(PROFILE_ROUTES.view)}
							disabled={saving}
						>
							Hủy
						</button>
						<button
							type="submit"
							className="profile-action-btn profile-action-btn--primary"
							disabled={saving}
						>
							{saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
						</button>
					</div>
				)}
			</form>
		</div>
	);
}

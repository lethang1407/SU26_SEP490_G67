import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../api';
import { PROFILE_ROUTES } from '../constants';
import { getApiErrorMessage, normalizePhoneNumber, validatePhoneNumber } from '../utils/profileUtils';

export default function ProfileEditForm({
	profile,
	formId = 'profile-edit-form',
	hideActions = false,
	onSavingChange,
}) {
	const navigate = useNavigate();
	const [form, setForm] = useState({
		fullName: profile.fullName ?? '',
		phoneNumber: profile.phoneNumber ?? '',
	});
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState(null);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
		setErrors((prev) => ({ ...prev, [name]: null }));
		setMessage(null);
	};

	const validate = () => {
		const nextErrors = {};
		const trimmedName = form.fullName.trim();

		if (!trimmedName) {
			nextErrors.fullName = 'Họ và tên không được để trống.';
		} else if (trimmedName.length < 2) {
			nextErrors.fullName = 'Họ và tên phải có ít nhất 2 ký tự.';
		}

		const phoneError = validatePhoneNumber(form.phoneNumber);
		if (phoneError) {
			nextErrors.phoneNumber = phoneError;
		}

		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;

		setSaving(true);
		onSavingChange?.(true);
		setMessage(null);

		const payload = {
			fullName: form.fullName.trim(),
			phoneNumber: normalizePhoneNumber(form.phoneNumber),
		};

		try {
			await updateProfile(payload);
			navigate(PROFILE_ROUTES.view);
		} catch (err) {
			setMessage({
				type: 'error',
				text: getApiErrorMessage(err, 'Không thể cập nhật thông tin. Vui lòng thử lại.'),
			});
		} finally {
			setSaving(false);
			onSavingChange?.(false);
		}
	};

	return (
		<div className="profile-edit-card">
			<div className="profile-edit-card__header">
				<h2 className="profile-edit-card__title">Thông tin cá nhân</h2>
			</div>
			<form
				id={formId}
				className="profile-edit-form"
				onSubmit={handleSubmit}
				noValidate
			>
				<div className="profile-edit-form__field">
					<label htmlFor="fullName">Họ và tên</label>
					<input
						id="fullName"
						name="fullName"
						type="text"
						value={form.fullName}
						onChange={handleChange}
						placeholder="Nhập họ và tên"
						className={`profile-edit-form__input${errors.fullName ? ' profile-edit-form__input--error' : ''}`}
					/>
					{errors.fullName && (
						<span className="profile-edit-form__error">{errors.fullName}</span>
					)}
				</div>

				<div className="profile-edit-form__field">
					<label htmlFor="phoneNumber">Số điện thoại</label>
					<input
						id="phoneNumber"
						name="phoneNumber"
						type="tel"
						value={form.phoneNumber}
						onChange={handleChange}
						placeholder="Nhập số điện thoại"
						className={`profile-edit-form__input${errors.phoneNumber ? ' profile-edit-form__input--error' : ''}`}
					/>
					{errors.phoneNumber && (
						<span className="profile-edit-form__error">{errors.phoneNumber}</span>
					)}
				</div>

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
							{saving ? 'Đang lưu...' : 'Lưu thay đổi'}
						</button>
					</div>
				)}
			</form>
		</div>
	);
}

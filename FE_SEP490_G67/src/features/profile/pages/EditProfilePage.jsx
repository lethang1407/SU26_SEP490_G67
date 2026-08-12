import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProfileEditForm from '../components/ProfileEditForm';
import { getProfile } from '../api';
import { PROFILE_ROUTES } from '../constants';
import { getApiErrorMessage } from '../utils/profileUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Profile.css';

const PROFILE_EDIT_FORM_ID = 'profile-edit-form';

export default function EditProfilePage() {
	const navigate = useNavigate();
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		getProfile()
			.then(setProfile)
			.catch((err) => {
				setError(getApiErrorMessage(err, 'Không thể tải thông tin hồ sơ.'));
			})
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="admin-content">
			
				<AdminHeader user={profile} activePage="profile" />
				<main className="admin-main">
					<div className="dashboard-container">
						<nav className="profile-breadcrumb" aria-label="Breadcrumb">
							<Link to={PROFILE_ROUTES.view} className="profile-breadcrumb__link">
								Hồ sơ người dùng
							</Link>
							<span className="profile-breadcrumb__sep">&gt;</span>
							<span className="profile-breadcrumb__current">Chỉnh sửa hồ sơ</span>
						</nav>

						<div className="profile-page-header">
							<h1 className="profile-page-header__title">Chỉnh sửa hồ sơ</h1>
							<div className="profile-page-header__actions">
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
									form={PROFILE_EDIT_FORM_ID}
									className="profile-action-btn profile-action-btn--primary"
									disabled={saving || loading || !!error}
								>
									{saving ? 'Đang lưu...' : 'Lưu thay đổi'}
								</button>
							</div>
						</div>

						{loading ? (
							<div className="profile-loading">
								<div className="profile-loading__spinner" />
								<p>Đang tải thông tin...</p>
							</div>
						) : error ? (
							<p className="profile-edit-form__message profile-edit-form__message--error">
								{error}
							</p>
						) : (
							<ProfileEditForm
								profile={profile}
								formId={PROFILE_EDIT_FORM_ID}
								hideActions
								onSavingChange={setSaving}
							/>
						)}
					</div>
				</main>
			</div>
	);
}

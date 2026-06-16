import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SideBar from '../../../components/ui/header-footer/SideBar';
import AdminHeader from '../../dashboard/components/AdminHeader';
import ProfileEditForm from '../components/ProfileEditForm';
import { getProfile } from '../api';
import '../../../css/AdminDashboard.css';
import '../../../css/Profile.css';

const PROFILE_EDIT_FORM_ID = 'profile-edit-form';

export default function EditProfilePage() {
	const navigate = useNavigate();
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		getProfile()
			.then(setProfile)
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="admin-layout">
			<SideBar />
			<div className="admin-content">
				<AdminHeader user={profile} activePage="profile" />
				<main className="admin-main">
					<div className="dashboard-container">
						<nav className="profile-breadcrumb" aria-label="Breadcrumb">
							<Link to="/admin/profile" className="profile-breadcrumb__link">
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
									onClick={() => navigate('/admin/profile')}
									disabled={saving}
								>
									Hủy
								</button>
								<button
									type="submit"
									form={PROFILE_EDIT_FORM_ID}
									className="profile-action-btn profile-action-btn--primary"
									disabled={saving || loading}
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
		</div>
	);
}

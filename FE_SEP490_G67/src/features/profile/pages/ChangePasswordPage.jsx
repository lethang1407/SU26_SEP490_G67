import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../dashboard/components/AdminHeader';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { getProfile } from '../api';
import { PROFILE_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/Profile.css';

const CHANGE_PASSWORD_FORM_ID = 'change-password-form';

export default function ChangePasswordPage() {
	const navigate = useNavigate();
	const [profile, setProfile] = useState(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		getProfile()
			.then(setProfile)
			.catch(() => setProfile(null));
	}, []);

	return (
		<div className="admin-layout">
			<SideBar />
			<div className="admin-content">
				<AdminHeader user={profile} activePage="profile" />
				<main className="admin-main">
					<div className="dashboard-container">
						<nav className="profile-breadcrumb" aria-label="Breadcrumb">
							<Link to={PROFILE_ROUTES.view} className="profile-breadcrumb__link">
								Hồ sơ người dùng
							</Link>
							<span className="profile-breadcrumb__sep">&gt;</span>
							<span className="profile-breadcrumb__current">Đổi mật khẩu</span>
						</nav>

						<div className="profile-page-header profile-page-header--stacked">
							<div>
								<h1 className="profile-page-header__title">Đổi mật khẩu</h1>
								<p className="profile-page-header__desc">
									Cập nhật mật khẩu đăng nhập của bạn. Sau khi đổi thành công,
									bạn có thể tiếp tục sử dụng hệ thống bình thường.
								</p>
							</div>
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
									form={CHANGE_PASSWORD_FORM_ID}
									className="profile-action-btn profile-action-btn--primary"
									disabled={saving}
								>
									{saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
								</button>
							</div>
						</div>

						<ChangePasswordForm
							username={profile?.username}
							formId={CHANGE_PASSWORD_FORM_ID}
							hideActions
							onSavingChange={setSaving}
						/>
					</div>
				</main>
			</div>
		</div>
	);
}

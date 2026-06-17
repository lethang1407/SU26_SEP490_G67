import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Pencil } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../dashboard/components/AdminHeader';
import ProfileViewCard from '../components/ProfileViewCard';
import ProfileSuccessToast from '../components/ProfileSuccessToast';
import { getProfile } from '../api';
import { PROFILE_ROUTES } from '../constants';
import { getApiErrorMessage } from '../utils/profileUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Profile.css';

export default function ProfilePage() {
	const navigate = useNavigate();
	const location = useLocation();
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [successMessage, setSuccessMessage] = useState(null);

	useEffect(() => {
		if (location.state?.message) {
			setSuccessMessage(location.state.message);
			navigate(location.pathname, { replace: true, state: {} });
		}
	}, [location.state, location.pathname, navigate]);

	useEffect(() => {
		getProfile()
			.then(setProfile)
			.catch((err) => {
				setError(getApiErrorMessage(err, 'Không thể tải thông tin hồ sơ.'));
			})
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="admin-layout">
			{successMessage && (
				<ProfileSuccessToast
					message={successMessage}
					onDismiss={() => setSuccessMessage(null)}
				/>
			)}
			<SideBar />
			<div className="admin-content">
				<AdminHeader user={profile} activePage="profile" />
				<main className="admin-main">
					<div className="dashboard-container">
						<nav className="profile-breadcrumb" aria-label="Breadcrumb">
							<span className="profile-breadcrumb__current">Hồ sơ người dùng</span>
						</nav>

						<div className="profile-page-header">
							<h1 className="profile-page-header__title">Hồ sơ người dùng</h1>
							<div className="profile-page-header__actions">
								<button
									type="button"
									className="profile-action-btn profile-action-btn--outline"
									onClick={() => navigate(PROFILE_ROUTES.changePassword)}
									disabled={loading || !!error}
								>
									<KeyRound size={16} />
									Đổi mật khẩu
								</button>
								<button
									type="button"
									className="profile-action-btn profile-action-btn--primary"
									onClick={() => navigate(PROFILE_ROUTES.edit)}
									disabled={loading || !!error}
								>
									<Pencil size={16} />
									Chỉnh sửa hồ sơ
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
							<ProfileViewCard profile={profile} />
						)}
					</div>
				</main>
			</div>
		</div>
	);
}

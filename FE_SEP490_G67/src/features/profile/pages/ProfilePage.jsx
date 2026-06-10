import { useEffect, useState } from 'react';
import { KeyRound, Pencil } from 'lucide-react';
import SideBar from '../../../components/ui/header-footer/SideBar';
import AdminHeader from '../../dashboard/components/AdminHeader';
import ProfileViewCard from '../components/ProfileViewCard';
import { getProfile } from '../api';
import '../../../css/AdminDashboard.css';
import '../../../css/Profile.css';

export default function ProfilePage() {
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);

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
					
						<div className="profile-page-header">
							<h1 className="profile-page-header__title">Hồ sơ người dùng</h1>
							<div className="profile-page-header__actions">
								<button
									type="button"
									className="profile-action-btn profile-action-btn--outline"
									title="Tính năng đang phát triển"
								>
									<KeyRound size={16} />
									Đổi mật khẩu
								</button>
								<button
									type="button"
									className="profile-action-btn profile-action-btn--primary"
									title="Tính năng đang phát triển"
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
						) : (
							<ProfileViewCard profile={profile} />
						)}
					</div>
				</main>
			</div>
		</div>
	);
}

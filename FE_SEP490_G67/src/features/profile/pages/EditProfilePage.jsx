import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SideBar from '../../../components/ui/header-footer/SideBar';
import AdminHeader from '../../dashboard/components/AdminHeader';
import ProfileEditForm from '../components/ProfileEditForm';
import { getProfile } from '../api';
import '../../../css/AdminDashboard.css';
import '../../../css/Profile.css';

export default function EditProfilePage() {
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
						<nav className="profile-breadcrumb" aria-label="Breadcrumb">
							<Link to="/admin/profile" className="profile-breadcrumb__link">
								Hồ sơ người dùng
							</Link>
							<span className="profile-breadcrumb__sep">&gt;</span>
							<span className="profile-breadcrumb__current">Chỉnh sửa hồ sơ</span>
						</nav>

						<div className="profile-page-header profile-page-header--stacked">
							<div>
								<h1 className="profile-page-header__title">Chỉnh sửa hồ sơ người dùng</h1>
								<p className="profile-page-header__desc">
									Cập nhật thông tin cá nhân của bạn tại đây. Những thay đổi sẽ được áp dụng
									ngay lập tức.
								</p>
							</div>
						</div>

						{loading ? (
							<div className="profile-loading">
								<div className="profile-loading__spinner" />
								<p>Đang tải thông tin...</p>
							</div>
						) : (
							<ProfileEditForm profile={profile} />
						)}
					</div>
				</main>
			</div>
		</div>
	);
}

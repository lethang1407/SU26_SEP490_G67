import { AtSign, Briefcase, Phone, User } from 'lucide-react';
import {
	formatPhoneNumber,
	getRoleLabel,
	getStatusLabel,
	isAccountActive,
} from '../utils/profileUtils';

function ProfileField({ label, value, icon: Icon }) {
	return (
		<div className="profile-field">
			<span className="profile-field__label">{label}</span>
			<div className="profile-field__value">
				<Icon size={18} className="profile-field__icon" />
				<span>{value || '—'}</span>
			</div>
		</div>
	);
}

export default function ProfileViewCard({ profile }) {
	const isActive = isAccountActive(profile.status);

	return (
		<div className="profile-view-card">
			<div className="profile-view-card__header">
				<h2 className="profile-view-card__title">Thông tin cá nhân</h2>
				<span
					className={`profile-view-card__status${isActive ? ' profile-view-card__status--active' : ''}`}
				>
					{getStatusLabel(profile.status)}
				</span>
			</div>

			<div className="profile-view-card__body">
				<ProfileField label="Họ và tên" value={profile.fullName} icon={User} />
				<ProfileField
					label="Vai trò hệ thống"
					value={getRoleLabel(profile.roles)}
					icon={Briefcase}
				/>
				<ProfileField label="Tên đăng nhập" value={profile.username} icon={AtSign} />
				<ProfileField
					label="Số điện thoại"
					value={formatPhoneNumber(profile.phoneNumber)}
					icon={Phone}
				/>
			</div>
		</div>
	);
}

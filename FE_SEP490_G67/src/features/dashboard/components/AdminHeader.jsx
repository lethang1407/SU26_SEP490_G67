import { Bell, User } from 'lucide-react';
import '../../../css/AdminHeader.css';

export default function AdminHeader() {
    return (
        <header className="admin-header">
            <div className="header-actions">
                <button className="header-btn" aria-label="Notifications">
                    <Bell size={20} />
                    <span className="notification-badge">3</span>
                </button>
                <button className="header-btn" aria-label="Profile">
                    <User size={20} />
                </button>
            </div>
        </header>
    );
}

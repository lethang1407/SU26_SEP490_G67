import { Plus } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import StaffTable from '../components/StaffTable';
import '../../../css/AdminDashboard.css';
import '../../../css/StaffManagement.css';

export default function StaffManagementPage() {
    const handleAddStaff = () => {       
    };

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container">
                        <div className="staff-management-header">
                            <h1 className="staff-management-header__title">Quản lý nhân viên</h1>
                            <button
                                type="button"
                                className="btn-add-staff"
                                onClick={handleAddStaff}
                            >
                                <Plus size={18} />
                                Thêm nhân viên mới
                            </button>
                        </div>
                        <StaffTable />
                    </div>
                </main>
            </div>
        </div>
    );
}

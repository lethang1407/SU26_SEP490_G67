import { Link, useNavigate, useParams } from 'react-router-dom';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import StaffInfoForm from '../components/StaffInfoForm';
import { getStaffById } from '../api/staffMockData';
import { STAFF_FORM_ID, STAFF_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/AddStaff.css';

export default function StaffInfoPage() {
    const navigate = useNavigate();
    const { staffId } = useParams();
    const staff = getStaffById(staffId);

    const handleCancel = () => {
        navigate(STAFF_ROUTES.list);
    };

    const handleSubmit = (formData) => {
        // TODO: gọi API cập nhật thông tin nhân viên
        console.log('Update staff:', { staffId, ...formData });
        navigate(STAFF_ROUTES.list);
    };

    if (!staff) {
        return (
            <div className="admin-layout">
                <SideBar />
                <div className="admin-content">
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container">
                            <p className="add-staff-not-found">Không tìm thấy thông tin nhân viên.</p>
                            <Link to={STAFF_ROUTES.list} className="add-staff-back-link">
                                Quay lại danh sách
                            </Link>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container">
                        <nav className="add-staff-breadcrumb" aria-label="Breadcrumb">
                            <Link to={STAFF_ROUTES.list} className="add-staff-breadcrumb__link">
                                Quản lý nhân viên
                            </Link>
                            <span className="add-staff-breadcrumb__sep">&gt;</span>
                            <span className="add-staff-breadcrumb__current">Thông tin nhân viên</span>
                        </nav>

                        <div className="add-staff-page-header">
                            <div>
                                <h1 className="add-staff-page-header__title">Thông tin nhân viên</h1>
                                <p className="add-staff-page-header__desc">
                                    Xem và chỉnh sửa thông tin, tài khoản và quyền truy cập của nhân viên.
                                </p>
                            </div>
                        </div>

                        <StaffInfoForm
                            formId={STAFF_FORM_ID}
                            initialData={staff}
                            saveButtonLabel="Lưu"
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}

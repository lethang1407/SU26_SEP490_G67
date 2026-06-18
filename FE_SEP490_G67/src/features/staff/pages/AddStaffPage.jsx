import { Link, useNavigate } from 'react-router-dom';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import StaffInfoForm from '../components/StaffInfoForm';
import { ADD_STAFF_FORM_ID, STAFF_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/AddStaff.css';

export default function AddStaffPage() {
    const navigate = useNavigate();

    const handleCancel = () => {
        navigate(STAFF_ROUTES.list);
    };

    const handleSubmit = (formData) => {
        // TODO: gọi API tạo nhân viên mới
        console.log('Create staff:', formData);
        navigate(STAFF_ROUTES.list);
    };

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
                            <span className="add-staff-breadcrumb__current">Thêm nhân viên mới</span>
                        </nav>

                        <div className="add-staff-page-header">
                            <div>
                                <h1 className="add-staff-page-header__title">Thêm nhân viên mới</h1>
                                <p className="add-staff-page-header__desc">
                                    Vui lòng điền đầy đủ thông tin để cấp quyền truy cập hệ thống.
                                </p>
                            </div>
                        </div>

                        <StaffInfoForm
                            formId={ADD_STAFF_FORM_ID}
                            isNewStaff
                            saveButtonLabel="Lưu nhân viên"
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import StaffInfoForm from '../components/StaffInfoForm';
import { getStaffById, updateStaff } from '../api';
import { STAFF_FORM_ID, STAFF_ROUTES } from '../constants';
import { getApiErrorMessage } from '../../../utils/api-utils';
import '../../../css/AdminDashboard.css';
import '../../../css/AddStaff.css';

export default function StaffInfoPage() {
    const navigate = useNavigate();
    const { staffId } = useParams();
    const [staff, setStaff] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [submitError, setSubmitError] = useState(null);

    useEffect(() => {
        let isCancelled = false;

        const fetchStaff = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await getStaffById(staffId);
                if (!isCancelled) {
                    setStaff(data);
                }
            } catch (fetchError) {
                if (!isCancelled) {
                    setStaff(null);
                    setError(getApiErrorMessage(fetchError, 'Không tìm thấy thông tin nhân viên.'));
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchStaff();

        return () => {
            isCancelled = true;
        };
    }, [staffId]);

    const handleCancel = () => {
        navigate(STAFF_ROUTES.list);
    };

    const handleSubmit = async (formData) => {
        setIsSubmitting(true);
        setSubmitError(null);

        const payload = { ...formData };
        if (!payload.password?.trim()) {
            delete payload.password;
        }

        try {
            await updateStaff(staffId, payload);
            navigate(STAFF_ROUTES.list);
        } catch (updateError) {
            setSubmitError(
                getApiErrorMessage(updateError, 'Không thể cập nhật nhân viên. Vui lòng thử lại.'),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="admin-layout">
                <SideBar />
                <div className="admin-content">
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container text-center p-5">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Đang tải...</span>
                            </Spinner>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (!staff) {
        return (
            <div className="admin-layout">
                <SideBar />
                <div className="admin-content">
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container">
                            <p className="add-staff-not-found">
                                {error ?? 'Không tìm thấy thông tin nhân viên.'}
                            </p>
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

                        {submitError && (
                            <Alert variant="danger" onClose={() => setSubmitError(null)} dismissible>
                                {submitError}
                            </Alert>
                        )}

                        <StaffInfoForm
                            key={staff.id}
                            formId={STAFF_FORM_ID}
                            initialData={staff}
                            isSubmitting={isSubmitting}
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

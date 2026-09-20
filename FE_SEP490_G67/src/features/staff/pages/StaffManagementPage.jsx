import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import { Plus } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import StaffFilters from '../components/StaffFilters';
import StaffTable from '../components/StaffTable';
import { getStaffList } from '../api';
import { ALL_ROLE_TEMPLATES, STAFF_ROUTES } from '../constants';
import { getStaffRoleTemplate } from '../../permission/constants/permissionDictionary';
import { getApiErrorMessage } from '../../../utils/api-utils';
import '../../../css/AdminDashboard.css';
import '../../../css/StaffManagement.css';

export default function StaffManagementPage() {
    const navigate = useNavigate();
    const [searchKeyword, setSearchKeyword] = useState('');
    const [roleTemplateFilter, setRoleTemplateFilter] = useState(ALL_ROLE_TEMPLATES);
    const [staffList, setStaffList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStaff = useCallback(async (keyword, showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError(null);

        try {
            const data = await getStaffList({
                keyword: keyword ? keyword.trim() : undefined,
            });
            setStaffList(data);
        } catch (fetchError) {
            setError(getApiErrorMessage(fetchError, 'Không thể tải danh sách nhân viên.'));
            setStaffList([]);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchStaff(searchKeyword, true);
        }, 300);

        return () => {
            clearTimeout(debounceTimer);
        };
    }, [searchKeyword, fetchStaff]);

    const handleRefresh = useCallback(() => {
        fetchStaff(searchKeyword, false);
    }, [searchKeyword, fetchStaff]);

    const handleAddStaff = () => {
        navigate(STAFF_ROUTES.create);
    };

    // Lọc theo Mẫu vai trò đã chọn
    const filteredStaffList = useMemo(() => {
        if (roleTemplateFilter === ALL_ROLE_TEMPLATES) {
            return staffList;
        }

        return staffList.filter((staff) => {
            const template = getStaffRoleTemplate(staff.permissions);
            return template.id === roleTemplateFilter;
        });
    }, [staffList, roleTemplateFilter]);

    return (
        <div className="admin-content">
            <AdminHeader />
            <main className="admin-main">
                <div className="dashboard-container">
                    <div className="staff-management-header">
                        <div>
                            <h1 className="staff-management-header__title">Quản lý nhân viên</h1>
                            <p className="text-muted small mt-1 mb-0">
                                Danh sách tài khoản nhân viên & cấu hình phân quyền theo mẫu vai trò.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn-add-staff"
                            onClick={handleAddStaff}
                        >
                            <Plus size={18} />
                            Thêm nhân viên mới
                        </button>
                    </div>

                    <StaffFilters
                        searchKeyword={searchKeyword}
                        roleTemplateFilter={roleTemplateFilter}
                        onSearchChange={setSearchKeyword}
                        onRoleTemplateChange={setRoleTemplateFilter}
                    />

                    {error && <Alert variant="danger">{error}</Alert>}

                    {isLoading ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" role="status" variant="primary">
                                <span className="visually-hidden">Đang tải...</span>
                            </Spinner>
                        </div>
                    ) : (
                        <StaffTable
                            staffList={filteredStaffList}
                            onRefresh={handleRefresh}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

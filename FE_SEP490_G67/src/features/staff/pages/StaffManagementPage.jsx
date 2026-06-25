import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import { Plus } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import StaffFilters from '../components/StaffFilters';
import StaffTable from '../components/StaffTable';
import { getStaffList } from '../api';
import { ALL_POSITIONS, NAME_SORT_ASC, STAFF_ROUTES } from '../constants';
import { getApiErrorMessage } from '../../../utils/api-utils';
import '../../../css/AdminDashboard.css';
import '../../../css/StaffManagement.css';

export default function StaffManagementPage() {
    const navigate = useNavigate();
    const [searchKeyword, setSearchKeyword] = useState('');
    const [positionFilter, setPositionFilter] = useState(ALL_POSITIONS);
    const [nameSort, setNameSort] = useState(NAME_SORT_ASC);
    const [staffList, setStaffList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isCancelled = false;
        const debounceTimer = setTimeout(async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await getStaffList({
                    keyword: searchKeyword.trim() || undefined,
                    position: positionFilter === ALL_POSITIONS ? undefined : positionFilter,
                    sort: nameSort,
                });

                if (!isCancelled) {
                    setStaffList(data);
                }
            } catch (fetchError) {
                if (!isCancelled) {
                    setError(getApiErrorMessage(fetchError, 'Không thể tải danh sách nhân viên.'));
                    setStaffList([]);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }, 300);

        return () => {
            isCancelled = true;
            clearTimeout(debounceTimer);
        };
    }, [searchKeyword, positionFilter, nameSort]);

    const handleAddStaff = () => {
        navigate(STAFF_ROUTES.create);
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
                        <StaffFilters
                            searchKeyword={searchKeyword}
                            positionFilter={positionFilter}
                            nameSort={nameSort}
                            onSearchChange={setSearchKeyword}
                            onPositionChange={setPositionFilter}
                            onNameSortChange={setNameSort}
                        />
                        {error && <Alert variant="danger">{error}</Alert>}
                        {isLoading ? (
                            <div className="text-center p-5">
                                <Spinner animation="border" role="status">
                                    <span className="visually-hidden">Đang tải...</span>
                                </Spinner>
                            </div>
                        ) : (
                            <StaffTable staffList={staffList} />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

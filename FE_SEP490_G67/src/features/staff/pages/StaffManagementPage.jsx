import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import StaffFilters from '../components/StaffFilters';
import StaffTable from '../components/StaffTable';
import { ALL_POSITIONS, NAME_SORT_ASC, STAFF_LIST } from '../api/staffMockData';
import { STAFF_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/StaffManagement.css';

export default function StaffManagementPage() {
    const navigate = useNavigate();
    const [searchKeyword, setSearchKeyword] = useState('');
    const [positionFilter, setPositionFilter] = useState(ALL_POSITIONS);
    const [nameSort, setNameSort] = useState(NAME_SORT_ASC);

    const filteredStaffList = useMemo(() => {
        const normalizedKeyword = searchKeyword.trim().toLowerCase();

        const filtered = STAFF_LIST.filter((staff) => {
            const matchesName = staff.name.toLowerCase().includes(normalizedKeyword);
            const matchesPosition =
                positionFilter === ALL_POSITIONS || staff.position === positionFilter;

            return matchesName && matchesPosition;
        });

        return filtered.sort((a, b) => {
            const compareResult = a.name.localeCompare(b.name, 'vi');
            return nameSort === NAME_SORT_ASC ? compareResult : -compareResult;
        });
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
                        <StaffTable staffList={filteredStaffList} />
                    </div>
                </main>
            </div>
        </div>
    );
}

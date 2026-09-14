import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { STAFF_ROUTES } from '../constants';
import UserPermissionsModal from '../../permission/components/UserPermissionsModal';

export default function StaffTable({ staffList }) {
    const navigate = useNavigate();
    const [selectedStaff, setSelectedStaff] = useState(null);

    const handleRowClick = (staffId) => {
        navigate(STAFF_ROUTES.detail(staffId));
    };

    const handleOpenPermissions = (e, staff) => {
        e.stopPropagation();
        setSelectedStaff(staff);
    };

    return (
        <>
            <div className="staff-table-card">
                <div className="staff-table-wrapper">
                    <table className="staff-table">
                        <colgroup>
                            <col className="staff-table__col-index" />
                            <col className="staff-table__col-spacer" />
                            <col className="staff-table__col-name" />
                            <col className="staff-table__col-gap" />
                            <col className="staff-table__col-phone" />
                            <col style={{ width: '120px' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="staff-table__col-index">STT</th>
                                <th className="staff-table__col-spacer" aria-hidden="true" />
                                <th className="staff-table__col-name">Tên nhân viên</th>
                                <th className="staff-table__col-gap" aria-hidden="true" />
                                <th className="staff-table__col-phone">Số điện thoại</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="staff-table__empty">
                                        Không tìm thấy nhân viên phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                staffList.map((staff, index) => (
                                    <tr
                                        key={staff.id}
                                        className="staff-table__row"
                                        onClick={() => handleRowClick(staff.id)}
                                    >
                                        <td className="staff-table__index">{index + 1}</td>
                                        <td className="staff-table__col-spacer" aria-hidden="true" />
                                        <td className="staff-table__name">{staff.name}</td>
                                        <td className="staff-table__col-gap" aria-hidden="true" />
                                        <td className="staff-table__phone">{staff.phone}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                                                onClick={(e) => handleOpenPermissions(e, staff)}
                                                title="Phân quyền riêng cho nhân viên"
                                            >
                                                <KeyRound size={14} /> Quyền
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedStaff && (
                <UserPermissionsModal
                    show={!!selectedStaff}
                    onHide={() => setSelectedStaff(null)}
                    user={selectedStaff}
                />
            )}
        </>
    );
}

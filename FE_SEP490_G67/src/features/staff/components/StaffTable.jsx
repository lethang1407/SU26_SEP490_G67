import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { STAFF_ROUTES } from '../constants';
import { getStaffRoleTemplate } from '../../permission/constants/permissionDictionary';
import UserPermissionsModal from '../../permission/components/UserPermissionsModal';

export default function StaffTable({ staffList, onRefresh }) {
    const navigate = useNavigate();
    const [selectedStaff, setSelectedStaff] = useState(null);

    const handleRowClick = (staffId) => {
        navigate(STAFF_ROUTES.detail(staffId));
    };

    const handleOpenPermissions = (e, staff) => {
        e.stopPropagation();
        setSelectedStaff(staff);
    };

    const handleCloseModal = () => {
        setSelectedStaff(null);
        onRefresh?.();
    };

    return (
        <>
            <div className="staff-table-card">
                <div className="staff-table-wrapper">
                    <table className="staff-table">
                        <colgroup>
                            <col style={{ width: '60px' }} />
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '18%' }} />
                            <col style={{ width: '32%' }} />
                            <col style={{ width: '130px' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="staff-table__col-index">STT</th>
                                <th>Tên nhân viên</th>
                                <th>Số điện thoại</th>
                                <th>Vai trò phân quyền</th>
                                <th className="text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="staff-table__empty">
                                        Không tìm thấy nhân viên phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                staffList.map((staff, index) => {
                                    const template = getStaffRoleTemplate(staff.permissions);
                                    return (
                                        <tr
                                            key={staff.id}
                                            className="staff-table__row"
                                            onClick={() => handleRowClick(staff.id)}
                                        >
                                            <td className="staff-table__index">{index + 1}</td>
                                            <td className="staff-table__name">
                                                <div className="staff-name-cell">
                                                    <span className="staff-name-cell__title">{staff.name}</span>
                                                </div>
                                            </td>
                                            <td className="staff-table__phone">{staff.phone}</td>
                                            <td>
                                                <span
                                                    className={`staff-role-badge ${template.badgeClass || ''}`}
                                                    style={{
                                                        backgroundColor: template.bg,
                                                        color: template.color,
                                                        borderColor: template.borderColor,
                                                    }}
                                                    title={`Mẫu phân quyền: ${template.name}`}
                                                >
                                                    <ShieldCheck size={14} className="flex-shrink-0" />
                                                    <span>{template.name}</span>
                                                </span>
                                            </td>
                                            <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 staff-btn-perm"
                                                    onClick={(e) => handleOpenPermissions(e, staff)}
                                                    title="Phân quyền chi tiết cho nhân viên"
                                                >
                                                    <KeyRound size={14} /> Phân quyền
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedStaff && (
                <UserPermissionsModal
                    show={!!selectedStaff}
                    onHide={handleCloseModal}
                    user={selectedStaff}
                />
            )}
        </>
    );
}

import { useNavigate } from 'react-router-dom';
import { STAFF_ROUTES } from '../constants';

export default function StaffTable({ staffList }) {
    const navigate = useNavigate();

    const handleRowClick = (staffId) => {
        navigate(STAFF_ROUTES.detail(staffId));
    };

    return (
        <div className="staff-table-card">
            <div className="staff-table-wrapper">
                <table className="staff-table">
                    <colgroup>
                        <col className="staff-table__col-index" />
                        <col className="staff-table__col-spacer" />
                        <col className="staff-table__col-name" />
                        <col className="staff-table__col-gap" />
                        <col className="staff-table__col-phone" />
                        <col className="staff-table__col-position" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="staff-table__col-index">STT</th>
                            <th className="staff-table__col-spacer" aria-hidden="true" />
                            <th className="staff-table__col-name">Tên nhân viên</th>
                            <th className="staff-table__col-gap" aria-hidden="true" />
                            <th className="staff-table__col-phone">Số điện thoại</th>
                            <th className="staff-table__col-position">Vị trí</th>
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
                                    <td className="staff-table__position">{staff.position}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

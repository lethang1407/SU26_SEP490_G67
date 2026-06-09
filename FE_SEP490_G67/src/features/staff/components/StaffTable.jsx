const STAFF_LIST = [
    { id: 1, name: 'Nguyễn Thành Nam', phone: '0912 345 678' },
    { id: 2, name: 'Trần Thị Hoa', phone: '0905 888 999' },
    { id: 3, name: 'Lê Văn Minh', phone: '0888 123 456' },
    { id: 4, name: 'Hoàng Phúc', phone: '0977 111 222' },
];

export default function StaffTable() {
    return (
        <div className="staff-table-card">
            <div className="staff-table-wrapper">
                <table className="staff-table">
                    <colgroup>
                        <col className="staff-table__col-spacer" />
                        <col className="staff-table__col-name" />
                        <col className="staff-table__col-gap" />
                        <col className="staff-table__col-phone" />
                        <col className="staff-table__col-spacer" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="staff-table__col-spacer" aria-hidden="true" />
                            <th className="staff-table__col-name">Nhân viên</th>
                            <th className="staff-table__col-gap" aria-hidden="true" />
                            <th className="staff-table__col-phone">Số điện thoại</th>
                            <th className="staff-table__col-spacer" aria-hidden="true" />
                        </tr>
                    </thead>
                    <tbody>
                        {STAFF_LIST.map((staff) => (
                            <tr key={staff.id}>
                                <td className="staff-table__col-spacer" aria-hidden="true" />
                                <td className="staff-table__name">{staff.name}</td>
                                <td className="staff-table__col-gap" aria-hidden="true" />
                                <td className="staff-table__phone">{staff.phone}</td>
                                <td className="staff-table__col-spacer" aria-hidden="true" />
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

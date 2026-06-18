import { ChevronDown, Search } from 'lucide-react';
import { ALL_POSITIONS, NAME_SORT_OPTIONS, STAFF_POSITIONS } from '../api/staffMockData';

export default function StaffFilters({
    searchKeyword,
    positionFilter,
    nameSort,
    onSearchChange,
    onPositionChange,
    onNameSortChange,
}) {
    return (
        <div className="staff-filters">
            <div className="staff-search">
                <Search size={18} className="staff-search__icon" />
                <input
                    type="text"
                    className="staff-search__input"
                    placeholder="Nhập tên nhân viên..."
                    value={searchKeyword}
                    onChange={(event) => onSearchChange(event.target.value)}
                />
            </div>
            <div className="staff-filters__group">
                <div className="staff-filter">
                    <span className="staff-filter__label">Vị trí:</span>
                    <div className="staff-filter__select-wrapper">
                        <select
                            className="staff-filter__select"
                            value={positionFilter}
                            onChange={(event) => onPositionChange(event.target.value)}
                        >
                            <option value={ALL_POSITIONS}>{ALL_POSITIONS}</option>
                            {STAFF_POSITIONS.map((position) => (
                                <option key={position} value={position}>
                                    {position}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={18} className="staff-filter__icon" />
                    </div>
                </div>
                <div className="staff-filter">
                    <span className="staff-filter__label">Tên:</span>
                    <div className="staff-filter__select-wrapper">
                        <select
                            className="staff-filter__select"
                            value={nameSort}
                            onChange={(event) => onNameSortChange(event.target.value)}
                        >
                            {NAME_SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={18} className="staff-filter__icon" />
                    </div>
                </div>
            </div>
        </div>
    );
}

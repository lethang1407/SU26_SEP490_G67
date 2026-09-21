import { ChevronDown, Search, ShieldCheck } from 'lucide-react';
import { ROLE_TEMPLATE_FILTER_OPTIONS } from '../constants';

export default function StaffFilters({
    searchKeyword,
    roleTemplateFilter,
    onSearchChange,
    onRoleTemplateChange,
}) {
    return (
        <div className="staff-filters">
            <div className="staff-search">
                <Search size={18} className="staff-search__icon" />
                <input
                    type="text"
                    className="staff-search__input"
                    placeholder="Tìm kiếm nhân viên (tên, SĐT)..."
                    value={searchKeyword}
                    onChange={(event) => onSearchChange(event.target.value)}
                />
            </div>
            <div className="staff-filters__group">
                <div className="staff-filter">
                    <span className="staff-filter__label">
                        <ShieldCheck size={16} className="text-primary me-1 inline-icon" />
                        Mẫu vai trò:
                    </span>
                    <div className="staff-filter__select-wrapper">
                        <select
                            className="staff-filter__select"
                            value={roleTemplateFilter}
                            onChange={(event) => onRoleTemplateChange(event.target.value)}
                        >
                            {ROLE_TEMPLATE_FILTER_OPTIONS.map((option) => (
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

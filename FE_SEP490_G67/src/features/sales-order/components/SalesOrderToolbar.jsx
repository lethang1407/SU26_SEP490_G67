import { Search } from 'lucide-react';
import {
    DATE_FILTERS,
    DEBT_FILTER,
    DEBT_FILTER_LABEL,
    ORDER_STATUS,
    ORDER_STATUS_LABEL,
    PAYMENT_METHOD,
    PAYMENT_METHOD_LABEL,
} from '../constants';

const STATUS_OPTIONS = [
    ORDER_STATUS.ALL,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.RETURNED,
];

const PAYMENT_OPTIONS = [
    PAYMENT_METHOD.ALL,
    PAYMENT_METHOD.CASH,
    PAYMENT_METHOD.TRANSFER,
    PAYMENT_METHOD.DEBT,
];

const DEBT_OPTIONS = [DEBT_FILTER.ALL, DEBT_FILTER.YES, DEBT_FILTER.NO];

export default function SalesOrderToolbar({
    keyword,
    onKeywordChange,
    dateFilter,
    onDateFilterChange,
    customFrom,
    customTo,
    onCustomFromChange,
    onCustomToChange,
    orderStatus,
    onOrderStatusChange,
    paymentMethod,
    onPaymentMethodChange,
    debtFilter,
    onDebtFilterChange,
}) {
    return (
        <div className="supplier-toolbar sales-order-toolbar">
            <div className="supplier-toolbar__search">
                <Search size={20} className="supplier-toolbar__search-icon" />
                <input
                    type="text"
                    className="supplier-toolbar__search-input"
                    placeholder="Tìm theo mã hóa đơn, tên khách hoặc SĐT..."
                    value={keyword}
                    onChange={(e) => onKeywordChange(e.target.value)}
                    aria-label="Tìm đơn hàng"
                />
            </div>

            <div className="sales-order-toolbar__row">
                <div className="supplier-toolbar__filters">
                    <span className="supplier-toolbar__filter-label">Thời gian:</span>
                    <div className="supplier-toolbar__chips" role="group" aria-label="Lọc theo thời gian">
                        {DATE_FILTERS.map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                className={`supplier-toolbar__chip ${dateFilter === key ? 'supplier-toolbar__chip--active' : ''
                                    }`}
                                onClick={() => onDateFilterChange(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {dateFilter === 'custom' && (
                        <div className="sales-order-toolbar__dates">
                            <input
                                type="date"
                                className="sales-order-toolbar__date-input"
                                value={customFrom}
                                onChange={(e) => onCustomFromChange(e.target.value)}
                            />
                            <span>–</span>
                            <input
                                type="date"
                                className="sales-order-toolbar__date-input"
                                value={customTo}
                                onChange={(e) => onCustomToChange(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="sales-order-toolbar__row sales-order-toolbar__selects">
                <label className="sales-order-toolbar__select-wrap">
                    <span>Trạng thái</span>
                    <select
                        value={orderStatus}
                        onChange={(e) => onOrderStatusChange(e.target.value)}
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                                {ORDER_STATUS_LABEL[opt]}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="sales-order-toolbar__select-wrap">
                    <span>Thanh toán</span>
                    <select
                        value={paymentMethod}
                        onChange={(e) => onPaymentMethodChange(e.target.value)}
                    >
                        {PAYMENT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                                {PAYMENT_METHOD_LABEL[opt]}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="sales-order-toolbar__select-wrap">
                    <span>Ghi nợ</span>
                    <select
                        value={debtFilter}
                        onChange={(e) => onDebtFilterChange(e.target.value)}
                    >
                        {DEBT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                                {DEBT_FILTER_LABEL[opt]}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
        </div>
    );
}

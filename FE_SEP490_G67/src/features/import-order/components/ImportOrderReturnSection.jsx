import { useEffect, useRef } from 'react';
import { RETURN_METHOD, formatMethod } from '../../import-return/constants';
import { formatCurrency } from '../utils/importOrderUtils';
import { lineAmount } from '../utils/importReturnAttachUtils';

export default function ImportOrderReturnSection({
    supplier,
    lines = [],
    selectedLineKeys = [],
    loading = false,
    readOnly = false,
    onToggleLine,
    onToggleAll,
}) {
    const selectedSet = new Set(selectedLineKeys.map(String));
    const allSelected = lines.length > 0 && lines.every((line) => selectedSet.has(String(line.key)));
    const someSelected = lines.some((line) => selectedSet.has(String(line.key)));
    const selectAllRef = useRef(null);

    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = someSelected && !allSelected;
        }
    }, [someSelected, allSelected]);

    return (
        <section className="ioc-section ioc-section--return">
            <header className="ioc-section__head">
                <div>
                    <h2 className="ioc-section__title">II. Đổi / trả nhà cung cấp</h2>
                </div>
            </header>

            {!readOnly && !supplier ? (
                <p className="ioc-section__empty">
                    Chọn nhà cung cấp ở cột phải để xem sản phẩm đang đổi/trả.
                </p>
            ) : loading ? (
                <p className="ioc-section__empty">Đang tải sản phẩm đổi/trả...</p>
            ) : lines.length === 0 ? (
                <p className="ioc-section__empty">
                    {readOnly
                        ? 'Phiếu này không gắn dòng đổi/trả nhà cung cấp.'
                        : 'NCC này không còn sản phẩm đổi/trả đang chờ. Lập phiếu trên màn trả hàng trước khi nhập.'}
                </p>
            ) : (
                <div className="ioc-lines-card">
                    <div className="ioc-lines-wrapper">
                        <table
                            className={`ioc-lines-table ioc-return-table${
                                readOnly ? ' ioc-return-table--readonly' : ''
                            }`}
                        >
                            <thead>
                                <tr>
                                    {readOnly ? null : (
                                        <th className="ioc-return-table__check">
                                            <input
                                                ref={selectAllRef}
                                                type="checkbox"
                                                className="ioc-return-check"
                                                checked={allSelected}
                                                onChange={() => onToggleAll(!allSelected)}
                                                aria-label="Chọn tất cả sản phẩm đổi/trả"
                                            />
                                        </th>
                                    )}
                                    <th className="ioc-lines-table__stt">STT</th>
                                    <th>Tên hàng</th>
                                    <th>Loại</th>
                                    <th>Số lượng</th>
                                    <th>Đơn giá</th>
                                    <th>Lô cũ</th>
                                    <th>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line, index) => {
                                    const selected = readOnly || selectedSet.has(String(line.key));
                                    const isExchange = line.method === RETURN_METHOD.EXCHANGE;
                                    const amount = isExchange ? 0 : lineAmount(line);

                                    return (
                                        <tr
                                            key={line.key}
                                            className={[
                                                selected ? 'ioc-return-table__row--selected' : '',
                                                isExchange
                                                    ? 'ioc-return-table__row--exchange'
                                                    : 'ioc-return-table__row--return',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                        >
                                            {readOnly ? null : (
                                                <td className="ioc-return-table__check">
                                                    <input
                                                        type="checkbox"
                                                        className="ioc-return-check"
                                                        checked={selected}
                                                        onChange={() => onToggleLine(line.key)}
                                                        aria-label={`Chọn ${line.productName}`}
                                                    />
                                                </td>
                                            )}
                                            <td className="ioc-lines-table__stt">{index + 1}</td>
                                            <td>
                                                <div className="ioc-lines-table__name">
                                                    {line.productName}
                                                </div>
                                                {line.returnReason ? (
                                                    <div className="ioc-lines-table__attrs">
                                                        {line.returnReason}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td>
                                                <span
                                                    className={`ioc-return-method ${
                                                        isExchange
                                                            ? 'ioc-return-method--exchange'
                                                            : 'ioc-return-method--return'
                                                    }`}
                                                >
                                                    {formatMethod(line.method)}
                                                </span>
                                            </td>
                                            <td>{line.quantity}</td>
                                            <td>{formatCurrency(line.returnPrice)}</td>
                                            <td>{line.batchCode || '—'}</td>
                                            <td className="ioc-lines-table__total">
                                                {selected
                                                    ? isExchange
                                                        ? '0đ'
                                                        : formatCurrency(amount)
                                                    : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}

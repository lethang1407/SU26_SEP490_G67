import { useEffect, useRef } from 'react';
import { RETURN_METHOD, formatMethod } from '../../import-return/constants';
import { formatCurrency, formatMoneyPlain } from '../utils/importOrderUtils';
import { lineAmount } from '../utils/importReturnAttachUtils';

export default function ImportOrderReturnSection({
    supplier,
    lines = [],
    selectedLineKeys = [],
    loading = false,
    readOnly = false,
    variant = 'default',
    onToggleLine,
    onToggleAll,
    onChangeMethod,
}) {
    const selectedSet = new Set(selectedLineKeys.map(String));
    const allSelected = lines.length > 0 && lines.every((line) => selectedSet.has(String(line.key)));
    const someSelected = lines.some((line) => selectedSet.has(String(line.key)));
    const selectAllRef = useRef(null);
    const isExpand = variant === 'expand';
    const formatMoney = isExpand ? formatMoneyPlain : formatCurrency;
    const zeroAmount = isExpand ? '0' : '0đ';

    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = someSelected && !allSelected;
        }
    }, [someSelected, allSelected]);

    const table = (
        <table
            className={
                isExpand
                    ? 'import-order-expand__table ioc-return-table ioc-return-table--readonly'
                    : `ioc-lines-table ioc-return-table${readOnly ? ' ioc-return-table--readonly' : ''}`
            }
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
                    <th className={isExpand ? 'import-order-expand__col-stt' : 'ioc-lines-table__stt'}>
                        STT
                    </th>
                    <th>Tên hàng</th>
                    <th className="ioc-return-table__method">Loại</th>
                    <th className={isExpand ? 'import-order-expand__col-num' : undefined}>Số lượng</th>
                    <th className={isExpand ? 'import-order-expand__col-num' : undefined}>Đơn giá</th>
                    <th className="ioc-return-table__batch">Lô cũ</th>
                    <th className={isExpand ? 'import-order-expand__col-num' : undefined}>Thành tiền</th>
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
                            <td
                                className={
                                    isExpand ? 'import-order-expand__col-stt' : 'ioc-lines-table__stt'
                                }
                            >
                                {index + 1}
                            </td>
                            <td>
                                <div
                                    className={
                                        isExpand
                                            ? 'import-order-expand__product-name'
                                            : 'ioc-lines-table__name'
                                    }
                                >
                                    {line.productName}
                                </div>
                                {line.returnReason ? (
                                    <div
                                        className={
                                            isExpand
                                                ? 'import-order-expand__line-meta'
                                                : 'ioc-lines-table__attrs'
                                        }
                                    >
                                        {line.returnReason}
                                    </div>
                                ) : null}
                            </td>
                            <td className="ioc-return-table__method">
                                {readOnly || !onChangeMethod ? (
                                    <span
                                        className={`ioc-return-method ${
                                            isExchange
                                                ? 'ioc-return-method--exchange'
                                                : 'ioc-return-method--return'
                                        }`}
                                    >
                                        {formatMethod(line.method)}
                                    </span>
                                ) : (
                                    <select
                                        className={`ioc-return-method ioc-return-method-select ${
                                            isExchange
                                                ? 'ioc-return-method--exchange'
                                                : 'ioc-return-method--return'
                                        }`}
                                        value={
                                            line.method === RETURN_METHOD.EXCHANGE
                                                ? RETURN_METHOD.EXCHANGE
                                                : RETURN_METHOD.RETURN
                                        }
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={(event) =>
                                            onChangeMethod(line.key, event.target.value)
                                        }
                                        aria-label={`Loại đổi/trả của ${line.productName}`}
                                    >
                                        <option value={RETURN_METHOD.RETURN}>Trả</option>
                                        <option value={RETURN_METHOD.EXCHANGE}>Đổi</option>
                                    </select>
                                )}
                            </td>
                            <td className={isExpand ? 'import-order-expand__col-num' : undefined}>
                                {line.quantity}
                                {line.unitName ? (
                                    <span className="import-order-expand__unit-label">
                                        {' '}
                                        {line.unitName}
                                    </span>
                                ) : null}
                            </td>
                            <td className={isExpand ? 'import-order-expand__col-num' : undefined}>
                                {formatMoney(line.returnPrice)}
                            </td>
                            <td className="ioc-return-table__batch">{line.batchCode || '—'}</td>
                            <td
                                className={
                                    isExpand
                                        ? 'import-order-expand__col-num import-order-expand__col-total'
                                        : 'ioc-lines-table__total'
                                }
                            >
                                {selected
                                    ? isExchange
                                        ? zeroAmount
                                        : formatMoney(amount)
                                    : '—'}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    return (
        <section
            className={
                isExpand ? 'import-order-expand__import-section' : 'ioc-section ioc-section--return'
            }
        >
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
            ) : isExpand ? (
                <div className="import-order-expand__table-wrap">{table}</div>
            ) : (
                <div className="ioc-lines-card">
                    <div className="ioc-lines-wrapper">{table}</div>
                </div>
            )}
        </section>
    );
}

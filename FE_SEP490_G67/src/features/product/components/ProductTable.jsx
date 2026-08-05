import { useNavigate } from 'react-router-dom';
import { getProductStatusLabel } from '../api/productMockData';
import { PRODUCT_ROUTES } from '../constants';
import { formatCurrency } from '../utils/productUtils';

export default function ProductTable({
    items,
    selectedIds,
    onToggleRow,
    onToggleAll,
}) {
    const navigate = useNavigate();
    const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
    const someSelected = items.some((item) => selectedIds.includes(item.id));

    const handleRowClick = (productId) => {
        navigate(PRODUCT_ROUTES.detail(productId));
    };

    if (items.length === 0) {
        return (
            <div className="product-table-card product-table-card--empty">
                <p>Không tìm thấy sản phẩm phù hợp.</p>
            </div>
        );
    }

    return (
        <div className="product-table-card">
            <div className="product-table-wrapper">
                <table className="product-table">
                    <thead>
                        <tr>
                            <th className="product-table__col-check">
                                <input
                                    type="checkbox"
                                    className="product-table__checkbox"
                                    checked={allSelected}
                                    ref={(input) => {
                                        if (input) {
                                            input.indeterminate = someSelected && !allSelected;
                                        }
                                    }}
                                    onChange={(event) => onToggleAll(event.target.checked)}
                                    aria-label="Chọn tất cả sản phẩm"
                                />
                            </th>
                            <th>Mã SKU</th>
                            <th>Tên sản phẩm</th>
                            <th>Danh mục</th>
                            <th>Giá nhập</th>
                            <th>Giá bán</th>
                            <th>Tồn kho</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((product) => {
                            const isOutOfStock = product.stock === 0;
                            const isSelected = selectedIds.includes(product.id);

                            return (
                                <tr
                                    key={product.id}
                                    className={`product-table__row${isSelected ? ' product-table__row--selected' : ''
                                        }`}
                                    onClick={() => handleRowClick(product.id)}
                                >
                                    <td className="product-table__col-check" onClick={(event) => event.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="product-table__checkbox"
                                            checked={isSelected}
                                            onChange={() => onToggleRow(product.id)}
                                            aria-label={`Chọn ${product.name}`}
                                        />
                                    </td>
                                    <td className="product-table__code">{product.code}</td>
                                    <td>
                                        <div className="product-table__name-cell">
                                            <div className="product-table__name-info">
                                                <span className="product-table__name">{product.name}</span>
                                                <span className="product-table__barcode">{product.barcode}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="product-table__category">{product.category}</td>
                                    <td className="product-table__import-price">
                                        {formatCurrency(product.importPrice)}
                                    </td>
                                    <td className="product-table__sell-price">
                                        {formatCurrency(product.sellPrice)}
                                    </td>
                                    <td
                                        className={`product-table__stock${isOutOfStock ? ' product-table__stock--empty' : ''
                                            }`}
                                    >
                                        {product.stock}
                                    </td>
                                    <td>
                                        <span
                                            className={`product-table__status${isOutOfStock
                                                    ? ' product-table__status--out-of-stock'
                                                    : ' product-table__status--in-stock'
                                                }`}
                                        >
                                            {getProductStatusLabel(product.stock)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

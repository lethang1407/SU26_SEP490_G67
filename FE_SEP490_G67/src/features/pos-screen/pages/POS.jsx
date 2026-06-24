import { useState, useCallback } from "react";
import {
    Search, X,
    RefreshCcw,
    History,
    Menu,
    Trash2,
    FileText,
    User,
    UserPlus,
    Pencil,
    Plus,
    AlertCircle,
    CheckCircle,
} from "lucide-react";
import "../../../css/POS.css";
import { isValidQtyInput, isValidQtyValue, isQtyInvalid, parseQty } from '../utils/validation';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useCheckout } from '../hooks/useCheckout';
import BatchSelectModal from '../components/BatchSelectModal';
import ReceiptModal from '../components/ReceiptModal';

const POSScreen = () => {
    const [cartItems, setCartItems] = useState([]);
    const [qtyInputs, setQtyInputs] = useState({});
    const [searchInput, setSearchInput] = useState('');
    const [pendingProduct, setPendingProduct] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');

    const onProductFound = useCallback((product) => {
        const batches = product.stockBatches ?? [];
        if (batches.length > 1) {
            setPendingProduct(product);
            return;
        }
        // Single batch (or no batch info) — add directly
        const batchCode = batches[0]?.batchCode ?? '';
        addProductToCart(product, batchCode);
    }, []);

    const addProductToCart = useCallback((product, batchCode) => {
        const units = product.productUnits ?? [];
        const unitBase = units.find((u) => Number(u.unitBase) === 1) ?? units[0];
        const newItem = {
            //check duplicate item
            id: `${product.id}-${batchCode}`,
            productId: product.id,
            code: product.barcode ?? product.id,
            name: product.name,
            unit: unitBase?.name ?? '—',
            batch: batchCode,
            qty: 1,
            price: product.sellingPrice ?? 0,
        };

        setCartItems((prev) => {
            const existing = prev.find((i) => i.id === newItem.id);
            if (existing) {
                return prev.map((i) => i.id === newItem.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, newItem];
        });
    }, []);

    //Barcode scanner hook
    const { scanning, error: scanError, clearError: clearScanError } =
        useBarcodeScanner({ onProductFound });

    //Checkout hook
    const {
        phone, setPhone,
        customer,
        invoiceType,
        submitting,
        receipt,
        error: checkoutError,
        lookupCustomer,
        submitCheckout,
        resetCheckout,
    } = useCheckout();

    //Qty editing handlers 
    const handleQtyChange = (id, raw) => {
        if (!isValidQtyInput(raw)) return;
        setQtyInputs((prev) => ({ ...prev, [id]: raw }));
    };

    const handleQtyBlur = (id) => {
        const raw = qtyInputs[id];
        if (!isValidQtyValue(raw)) {
            setQtyInputs((prev) => { const n = { ...prev }; delete n[id]; return n; });
        } else {
            setCartItems((prev) =>
                prev.map((item) => item.id === id ? { ...item, qty: parseQty(raw) } : item)
            );
            setQtyInputs((prev) => { const n = { ...prev }; delete n[id]; return n; });
        }
    };

    const changeQty = (id, delta) => {
        setCartItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const next = Math.round((item.qty + delta) * 1000) / 1000;
                return next > 0 ? { ...item, qty: next } : item;
            })
        );
        setQtyInputs((prev) => { const n = { ...prev }; delete n[id]; return n; });
    };

    const removeItem = (id) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
        setQtyInputs((prev) => { const n = { ...prev }; delete n[id]; return n; });
    };

    //Derived values 
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);

    //New order reset
    const handleNewOrder = () => {
        setCartItems([]);
        setQtyInputs({});
        setSearchInput('');
        setPendingProduct(null);
        resetCheckout();
        clearScanError();
    };

    return (
        <div className="pos-container">
            <header className="pos-header">
                <div className="pos-header-left">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm hàng hóa..."
                            className="search-input"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            disabled={scanning}
                            autoFocus
                        />
                    </div>
                </div>
                <div className="pos-header-center">
                    <div className="tab-active">
                        Hóa đơn 1
                        <button className="tab-close">
                            <X size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                    <button className="btn-add-tab">
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </div>
                <div className="pos-header-right">
                    <button className="icon-btn" onClick={handleNewOrder} title="Tạo đơn mới">
                        <RefreshCcw size={20} />
                    </button>
                    <button className="icon-btn"><History size={20} /></button>
                    <button className="icon-btn"><Menu size={24} /></button>
                </div>
            </header>

            {/* SCAN ERROR BANNER */}
            {scanError && (
                <div className="scan-error-banner">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        {scanError}
                    </span>
                    <button onClick={clearScanError} title="Đóng">
                        <X size={16} />
                    </button>
                </div>
            )}
            <div className="pos-main">

                {/* LEFT COLUMN - CART */}
                <div className="pos-cart-section">
                    <div className="cart-table-wrapper">
                        <table className="cart-table">
                            <thead>
                                <tr>
                                    <th className="col-stt">STT</th>
                                    <th>MÃ HÀNG</th>
                                    <th>TÊN HÀNG</th>
                                    <th>ĐVT</th>
                                    <th>LÔ HÀNG</th>
                                    <th className="text-center">SỐ LƯỢNG</th>
                                    <th className="text-right">ĐƠN GIÁ</th>
                                    <th className="text-right">THÀNH TIỀN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cartItems.length === 0 && (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
                                            Quét mã vạch hoặc tìm kiếm để thêm sản phẩm
                                        </td>
                                    </tr>
                                )}
                                {cartItems.map((item, index) => {
                                    const rawVal = qtyInputs[item.id];
                                    const displayVal = rawVal !== undefined ? rawVal : item.qty;
                                    const isInvalid = isQtyInvalid(rawVal);
                                    console.log(item);
                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {index + 1}
                                                    <button className="btn-delete" title="Xóa" onClick={() => removeItem(item.id)}>
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="font-bold">{item.code}</td>
                                            <td>{item.name}</td>
                                            <td>{item.unit}</td>
                                            <td><span className="batch-cell">{item.batch}</span></td>
                                            <td>
                                                <div className="qty-control">
                                                    <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>-</button>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={displayVal}
                                                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                                        onBlur={() => handleQtyBlur(item.id)}
                                                        className={`qty-input${isInvalid ? ' qty-input-error' : ''}`}
                                                        title={isInvalid ? 'Số lượng phải là số thực > 0' : ''}
                                                    />
                                                    <button className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                                                </div>
                                                {isInvalid && (
                                                    <div className="qty-error-msg">Phải là số &gt; 0</div>
                                                )}
                                            </td>
                                            <td className="text-right">{item.price.toLocaleString()}</td>
                                            <td className="text-right font-bold">{(item.price * item.qty).toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* LEFT FOOTER */}
                    <div className="cart-footer">
                        <div className="note-wrapper">
                            <FileText className="search-icon" size={18} />
                            <input type="text" placeholder="Nhập ghi chú cho đơn hàng" className="note-input" />
                        </div>
                        <div className="total-items">
                            Tổng cộng: <span>{totalItems} mặt hàng</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - PAYMENT */}
                <div className="pos-payment-section">
                    <div className="payment-content">

                        {/* Customer Search */}
                        <div className="customer-search">
                            <div className="search-wrapper">
                                <User className="search-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder="Số điện thoại khách hàng"
                                    className="customer-input"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && phone.trim()) {
                                            lookupCustomer(phone.trim());
                                        }
                                    }}
                                />
                            </div>
                            <button
                                className="btn-add-customer"
                                title="Tra cứu khách hàng"
                                onClick={() => phone.trim() && lookupCustomer(phone.trim())}
                            >
                                <UserPlus size={20} />
                            </button>
                        </div>

                        {/* Customer badge */}
                        {invoiceType === 'standard' && customer && (
                            <div style={{ marginBottom: '12px' }}>
                                <span className="customer-badge found">
                                    <CheckCircle size={13} />
                                    {customer.fullName}
                                </span>
                            </div>
                        )}
                        {invoiceType === 'debt' && (
                            <div style={{ marginBottom: '12px' }}>
                                <span className="customer-badge debt">
                                    Không tìm thấy - Bán nợ
                                </span>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="summary-row">
                            <span>Tổng tiền hàng</span>
                            <span className="font-bold">{totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="summary-row dashed-border">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#2563eb' }}>
                                Giảm giá <Pencil size={14} />
                            </span>
                            <span className="font-bold">0</span>
                        </div>
                        <div className="summary-row" style={{ marginTop: '16px' }}>
                            <span className="font-bold">KHÁCH CẦN TRẢ</span>
                            <span className="text-blue-large">{totalAmount.toLocaleString()}</span>
                        </div>

                        {/* Payment Methods */}
                        <div>
                            <span className="payment-methods-title">Hình thức thanh toán</span>
                            <div className="methods-grid">
                                {['cash', 'transfer', 'debt'].map((method) => (
                                    <label
                                        key={method}
                                        className={`method-label ${paymentMethod === method ? 'active' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            checked={paymentMethod === method}
                                            onChange={() => setPaymentMethod(method)}
                                        />
                                        <span>
                                            {method === 'cash' && 'Tiền mặt'}
                                            {method === 'transfer' && 'Chuyển khoản'}
                                            {method === 'debt' && 'Bán nợ'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Checkout error */}
                        {checkoutError && (
                            <div className="scan-error-banner" style={{ marginTop: '12px', borderRadius: '4px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={16} />
                                    {checkoutError}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Checkout Button */}
                    <div className="payment-footer">
                        <button
                            className="btn-checkout"
                            disabled={submitting || cartItems.length === 0}
                            onClick={() => submitCheckout(cartItems, paymentMethod)}
                        >
                            {submitting ? 'ĐANG XỬ LÝ...' : 'THANH TOÁN'}
                        </button>
                    </div>
                </div>
            </div>

            {/*BATCH SELECT MODAL */}
            {pendingProduct && (
                <BatchSelectModal
                    product={pendingProduct}
                    onSelect={(batchCode) => {
                        addProductToCart(pendingProduct, batchCode);
                        setPendingProduct(null);
                    }}
                    onClose={() => setPendingProduct(null)}
                />
            )}

            {/* RECEIPT MODAL */}
            {receipt && (
                <ReceiptModal
                    receipt={receipt}
                    onClose={() => {
                        handleNewOrder();
                    }}
                />
            )}
        </div>
    );
};

export default POSScreen;
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Search, X,
    RefreshCcw,
    History,
    Home,
    RotateCcw,
    ClipboardList,
    Trash2,
    Pencil,
    Plus,
    AlertCircle,
    Lock,
} from "lucide-react";
import "../../../css/POS.css";
import { isValidQtyInput, isValidQtyValue, isQtyInvalid, parseQty } from '../utils/validation';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useCheckout } from '../hooks/useCheckout';
import { useProductSearch } from '../hooks/useProductSearch';
import { useCustomerSearch } from '../hooks/useCustomerSearch';
import { pickKey, hasLocationProblem } from '../utils/cartLocation';
import {
    debtLevelMeta, canSellOnDebt, debtSummaryText, debtBlockReason, formatMoney,
    isOverdueCustomer, debtOverdueWarning,
} from '../utils/debtStatus';
import { formatVnd } from '../utils/money';
import ProductSearchDropdown from '../components/ProductSearchDropdown';
import LocationPicker from '../components/LocationPicker';
import CustomerSearchDropdown from '../components/CustomerSearchDropdown';
import QuickAddCustomerModal from '../components/QuickAddCustomerModal';
import SalesOrderHistoryModal from '../components/SalesOrderHistoryModal';
import DebtConfirmModal from '../components/DebtConfirmModal';
import ExchangeOrder from '../components/ExchangeOrder';
import { saveActiveCart, loadActiveCart } from '../utils/cartStorage';
import { printInvoice } from '../utils/printInvoice';
import { createQuickCustomer, getProductPosInfo, getInvoiceData } from '../api';

const MAX_TABS = 10;

// Hằng số dùng chung cho tab không có giỏ
const EMPTY_CART = [];
const EMPTY_QTY_INPUTS = {};

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Tiền mặt' },
    { value: 'transfer', label: 'Chuyển khoản' },
    { value: 'debt', label: 'Bán nợ' },
];

/** Hạn trả nợ mặc định: 45 ngày kể từ hôm nay, dạng yyyy-MM-dd cho input date. */
const DEFAULT_DEBT_DAYS = 45;
function toDateInput(date) {
    const tzOffsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}
function defaultDueDate() {
    const d = new Date();
    d.setDate(d.getDate() + DEFAULT_DEBT_DAYS);
    return toDateInput(d);
}

let _tabCounter = 1;
function nextTabId() { return ++_tabCounter; }

function createTab(id = 1) {
    return {
        id,
        type: 'SALE',
        cartItems: [],
        qtyInputs: {},
        paymentMethod: 'cash',
    };
}

function createReturnTab(id, orderId) {
    return { id, type: 'RETURN', orderId: String(orderId) };
}

const POSScreen = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [tabs, setTabs] = useState(() => {
        const saved = loadActiveCart();
        const saleTab = saved ? { ...createTab(1), ...saved } : createTab(1);
        const returnOrderId = searchParams.get('return');
        return returnOrderId
            ? [saleTab, createReturnTab(nextTabId(), returnOrderId)]
            : [saleTab];
    });
    const [activeTabId, setActiveTabId] = useState(() => tabs[tabs.length - 1].id);

    const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];
    const isReturnTab = activeTab.type === 'RETURN';

    const tabLabels = useMemo(() => {
        let sale = 0;
        let ret = 0;
        return Object.fromEntries(tabs.map(t => [
            t.id,
            t.type === 'RETURN' ? `Trả hàng ${++ret}` : `Hóa đơn ${++sale}`,
        ]));
    }, [tabs]);

    const cartItems = useMemo(() => activeTab.cartItems ?? EMPTY_CART, [activeTab.cartItems]);
    const qtyInputs = useMemo(() => activeTab.qtyInputs ?? EMPTY_QTY_INPUTS, [activeTab.qtyInputs]);

    const setCartItems = useCallback((updater) => {
        setTabs(prev => prev.map(t =>
            t.id === activeTabId
                ? { ...t, cartItems: typeof updater === 'function' ? updater(t.cartItems) : updater }
                : t
        ));
    }, [activeTabId]);

    const setQtyInputs = useCallback((updater) => {
        setTabs(prev => prev.map(t =>
            t.id === activeTabId
                ? { ...t, qtyInputs: typeof updater === 'function' ? updater(t.qtyInputs) : updater }
                : t
        ));
    }, [activeTabId]);

    const paymentMethod = activeTab.paymentMethod ?? 'cash';
    const setPaymentMethod = useCallback((value) => {
        setTabs(prev => prev.map(t =>
            t.id === activeTabId ? { ...t, paymentMethod: value } : t
        ));
    }, [activeTabId]);

    // Add new tab (tối đa MAX_TABS hóa đơn)
    const handleAddTab = useCallback(() => {
        if (tabs.length >= MAX_TABS) return;
        const id = nextTabId();
        setTabs(prev => [...prev, createTab(id)]);
        setActiveTabId(id);
    }, [tabs.length]);

    const handleOpenReturnTab = useCallback((orderId) => {
        const key = String(orderId);
        const existing = tabs.find(t => t.type === 'RETURN' && t.orderId === key);
        if (existing) {
            setActiveTabId(existing.id);
            return;
        }
        if (tabs.length >= MAX_TABS) return;
        const id = nextTabId();
        setTabs(prev => [...prev, createReturnTab(id, key)]);
        setActiveTabId(id);
    }, [tabs]);

    const returnDirtyRef = useRef({});
    const handleReturnDirtyChange = useCallback((tabId, dirty) => {
        returnDirtyRef.current[tabId] = dirty;
    }, []);

    const closeTab = useCallback((tabId) => {
        delete returnDirtyRef.current[tabId];
        setTabs(prev => {
            if (prev.length === 1) {
                if (prev[0].type !== 'RETURN') return prev;
                const fresh = createTab(nextTabId());
                setActiveTabId(fresh.id);
                return [fresh];
            }
            const next = prev.filter(t => t.id !== tabId);
            if (activeTabId === tabId) {
                setActiveTabId(next[next.length - 1].id);
            }
            return next;
        });
    }, [activeTabId]);

    const handleCloseTab = useCallback((tabId, e) => {
        e.stopPropagation();
        if (returnDirtyRef.current[tabId]
            && !window.confirm('Đóng thông tin của đơn sẽ không lưu lại. Bạn có chắc muốn đóng không?')) {
            return;
        }
        closeTab(tabId);
    }, [closeTab]);

    // false | 'exchange' (chọn đơn để trả/đổi) | 'history' (chỉ tra cứu)
    const [historyOpen, setHistoryOpen] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [posInfoError, setPosInfoError] = useState(null);
    const [cashGivenInput, setCashGivenInput] = useState('');

    // Bán nợ: tiền khách đưa trước, để trống là nợ toàn bộ
    const [prepaidInput, setPrepaidInput] = useState('');
    const [dueDate, setDueDate] = useState(defaultDueDate);

    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickAddLoading, setQuickAddLoading] = useState(false);
    const [quickAddError, setQuickAddError] = useState(null);

    const [discountEditing, setDiscountEditing] = useState(false);
    const discountInputRef = useRef(null);

    // Thanh toán xong nhưng không lấy được bản in. Đơn vẫn đã lưu, nên đây là
    // cảnh báo in lại chứ không phải lỗi thanh toán.
    const [printError, setPrintError] = useState(null);

    // Hộp xác nhận ghi nợ thêm cho khách đang còn nợ.
    const [debtConfirmOpen, setDebtConfirmOpen] = useState(false);

    const addProductToCart = useCallback((product, posInfo) => {
        const units = product.productUnits ?? [];
        const defaultUnit = units.find((u) => u.isDefault)
            ?? units.find((u) => Number(u.unitBase) === 1)
            ?? units[0];

        const locations = (posInfo?.locations ?? []).filter((loc) => Number(loc.quantity ?? 0) > 0);
        const defaultLoc = locations.find(
            (loc) => loc.locationId === posInfo?.defaultLocationId
                && loc.batchId === posInfo?.defaultBatchId
        ) ?? locations[0] ?? null;

        const newItem = {
            // Một sản phẩm là một dòng giỏ
            id: String(product.id),
            productId: product.id,
            code: product.barcode ?? product.id,
            name: product.name,
            units,
            productUnitId: defaultUnit?.id ?? null,
            unit: defaultUnit?.name ?? '—',
            locations,
            pickKeys: defaultLoc ? [pickKey(defaultLoc)] : [],
            stockTotal: posInfo?.availableQuantity ?? null,
            stockSales: posInfo?.salesZoneQuantity ?? null,
            stockWarehouse: posInfo?.warehouseQuantity ?? null,
            qty: 1,
            price: defaultUnit?.sellingPrice ?? product.sellingPrice ?? 0,
        };
        setCartItems((prev) => {
            const existing = prev.find((i) => i.id === newItem.id);
            if (existing) {
                return prev.map((i) => i.id === newItem.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, newItem];
        });
    }, [setCartItems]);

    const onProductFound = useCallback(async (product) => {
        // Vị trí + lô lấy từ pos-info chứ không đoán từ stockBatches
        try {
            const posInfo = await getProductPosInfo(product.id);
            setPosInfoError(null);
            addProductToCart(product, posInfo);
        } catch {
            setPosInfoError(`Không tải được vị trí để hàng của "${product.name}". Vui lòng thử lại.`);
        }
    }, [addProductToCart]);

    const togglePick = useCallback((id, key) => {
        setCartItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const current = item.pickKeys ?? [];
                const next = current.includes(key)
                    ? current.filter((k) => k !== key)
                    : [...current, key];
                const ordered = (item.locations ?? [])
                    .map(pickKey)
                    .filter((k) => next.includes(k));
                return { ...item, pickKeys: ordered };
            })
        );
    }, [setCartItems]);

    const changeUnit = useCallback((id, productUnitId) => {
        setCartItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const selectedUnit = (item.units ?? []).find(
                    (u) => String(u.id) === String(productUnitId)
                );
                if (!selectedUnit) return item;
                return {
                    ...item,
                    productUnitId: selectedUnit.id,
                    unit: selectedUnit.name,
                    price: selectedUnit.sellingPrice ?? item.price,
                };
            })
        );
    }, [setCartItems]);

    // Product name search hook
    const { results: searchResults, loading: searchLoading, error: searchError, clearResults } =
        useProductSearch(searchInput);

    const showDropdown = searchInput.trim().length >= 2 && (searchLoading || searchError || searchResults.length >= 0);
    const returnPaneRefs = useRef({});

    const handleSearchSelect = useCallback((product) => {
        if (isReturnTab) {
            returnPaneRefs.current[activeTabId]?.addExchangeProduct(product);
        } else {
            onProductFound(product);
        }
        setSearchInput('');
        clearResults();
    }, [isReturnTab, activeTabId, onProductFound, clearResults]);

    const { scanning, error: scanError, clearError: clearScanError } =
        useBarcodeScanner({ onProductFound, enabled: !isReturnTab });

    // Checkout hook
    const {
        phone, setPhone,
        customer,
        discount, setDiscount,
        submitting,
        error: checkoutError,
        attachCustomer,
        detachCustomer,
        submitCheckout,
        resetCheckout,
    } = useCheckout();

    const { results: customerResults, loading: customerSearchLoading, error: customerSearchError, clearResults: clearCustomerResults } =
        useCustomerSearch(customer ? '' : phone);

    const showCustomerDropdown = !customer && !showQuickAdd && phone.trim().length >= 1 &&
        (customerSearchLoading || customerSearchError || customerResults.length >= 0);

    const handleCustomerSelect = useCallback((cust) => {
        attachCustomer(cust);
        clearCustomerResults();
    }, [attachCustomer, clearCustomerResults]);

    const handleRemoveCustomer = useCallback(() => {
        detachCustomer();
        setShowQuickAdd(false);
        setQuickAddError(null);
        clearCustomerResults();
    }, [detachCustomer, clearCustomerResults]);

    // Chỉ cần chưa chọn khách là thêm mới được. Trước đây còn đòi ô tìm kiếm phải
    // chứa số điện thoại hợp lệ, nên tìm theo TÊN không ra kết quả thì nút "+" bị
    // khóa cứng — đúng lúc cần thêm khách nhất thì lại không thêm được.
    const canQuickAdd = !customer;

    // Ô tìm kiếm nhận cả tên lẫn số, nên đoán xem thu ngân vừa gõ gì để điền sẵn
    // đúng ô trong popup, khỏi phải gõ lại.
    const quickAddPrefill = useMemo(() => {
        const raw = phone.trim();
        return /^\d+$/.test(raw)
            ? { name: '', phone: raw }
            : { name: raw, phone: '' };
    }, [phone]);

    const handleUserPlus = useCallback(() => {
        if (customer) return;
        setQuickAddError(null);
        setShowQuickAdd(true);
    }, [customer]);

    const handleQuickAddSubmit = useCallback(async ({ fullName, phoneNumber }) => {
        setQuickAddLoading(true);
        setQuickAddError(null);
        try {
            const newCustomer = await createQuickCustomer({ fullName, phoneNumber });
            attachCustomer(newCustomer);
            setShowQuickAdd(false);
            clearCustomerResults();
        } catch (err) {
            const msg = err.response?.data?.message ?? 'Không thể thêm khách hàng. Vui lòng thử lại.';
            setQuickAddError(msg);
        } finally {
            setQuickAddLoading(false);
        }
    }, [attachCustomer, clearCustomerResults]);

    const handleQuickAddClose = useCallback(() => {
        setShowQuickAdd(false);
        setQuickAddError(null);
    }, []);

    // Qty editing handlers
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

    // Chặn thanh toán khi còn dòng chưa chọn được vị trí hoặc vị trí không đủ hàng.
    const locationBlocked = cartItems.some(hasLocationProblem);

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);
    const safeDiscount = Math.min(discount, subtotal);
    const amountDue = subtotal - safeDiscount;

    const cashGiven = cashGivenInput.trim() === ''
        ? amountDue
        : (parseFloat(cashGivenInput) || 0);
    const changeDue = cashGiven - amountDue;

    // Bán nợ: trả trước bao nhiêu, còn nợ bao nhiêu
    const isDebtMode = paymentMethod === 'debt';
    const prepaid = parseFloat(prepaidInput) || 0;
    // Trả đủ thì không còn là đơn nợ
    const prepaidInvalid = prepaid < 0 || (amountDue > 0 && prepaid >= amountDue);
    const remainingDebt = Math.max(0, amountDue - prepaid);
    const debtCustomerBlocked = isDebtMode && !canSellOnDebt(customer);
    const debtBlockedReason = isDebtMode ? debtBlockReason(customer) : null;
    const debtBlocked = isDebtMode
        && (debtCustomerBlocked || !dueDate || prepaidInvalid);

    const customerMeta = debtLevelMeta(customer);
    const customerSummary = debtSummaryText(customer);
    const customerOverdue = isOverdueCustomer(customer);
    // Quá hạn chỉ cảnh báo, không chặn ghi nợ nữa.
    const overdueWarning = isDebtMode ? debtOverdueWarning(customer) : null;

    useEffect(() => {
        if (isReturnTab) return;
        saveActiveCart(cartItems, qtyInputs);
    }, [cartItems, qtyInputs, isReturnTab]);

    const handleNewOrder = () => {
        setCartItems([]);
        setQtyInputs({});
        setSearchInput('');
        setPosInfoError(null);
        clearResults();
        resetCheckout();
        clearScanError();
        clearCustomerResults();
        setShowQuickAdd(false);
        setQuickAddError(null);
        setDiscountEditing(false);
        setCashGivenInput('');
        setPaymentMethod('cash');
        setPrepaidInput('');
        setDueDate(defaultDueDate());
    };

    const runCheckout = async () => {
        const result = await submitCheckout(cartItems, paymentMethod, {
            paidAmount: prepaid,
            dueDate,
        });
        if (!result.ok) return;
        const orderId = result.order?.id ?? result.invoice?.orderId ?? null;
        let invoice = result.invoice;
        if (!invoice && orderId != null) {
            try {
                invoice = await getInvoiceData(orderId);
            } catch {
                // Báo cho thu ngân ở dưới, đơn vẫn đã lưu thành công.
            }
        }

        if (invoice) {
            printInvoice(invoice);
            setPrintError(null);
        } else {
            const code = result.order?.orderCode ?? orderId ?? '';
            setPrintError(
                `Đơn ${code} đã lưu thành công nhưng không tải được bản in. `
                + 'Vào "Lịch sử đơn hàng" để in lại.'
            );
        }
        handleNewOrder();
    };

    const handleCheckout = () => {
        if (isDebtMode && customerMeta?.cls === 'debt-dot--yellow') {
            setDebtConfirmOpen(true);
            return;
        }
        runCheckout();
    };

    const handleDebtConfirm = () => {
        setDebtConfirmOpen(false);
        runCheckout();
    };

    // Discount editing
    const handleDiscountEditToggle = () => {
        setDiscountEditing(prev => !prev);
        if (!discountEditing) {
            setTimeout(() => discountInputRef.current?.focus(), 50);
        }
    };

    return (
        <div className="pos-container">
            <header className="pos-header">
                <div className="pos-header-left">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Thêm sản phẩm vào đơn"
                            className="search-input"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            disabled={scanning}
                            autoFocus
                        />
                        {showDropdown && (
                            <ProductSearchDropdown
                                results={searchResults}
                                loading={searchLoading}
                                error={searchError}
                                onSelect={handleSearchSelect}
                                onClose={() => {
                                    setSearchInput('');
                                    clearResults();
                                }}
                            />
                        )}
                    </div>

                    {/*  Order Tabs  */}
                    <div className="pos-header-tabs-area">
                        <div className="pos-header-tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    className={tab.id === activeTabId ? 'tab-active' : 'tab-inactive'}
                                    onClick={() => setActiveTabId(tab.id)}
                                    title={tabLabels[tab.id]}
                                >
                                    <span className="tab-label">{tabLabels[tab.id]}</span>
                                    {tabs.length > 1 && (
                                        <span
                                            className="tab-close"
                                            onClick={(e) => handleCloseTab(tab.id, e)}
                                            title="Đóng hóa đơn này"
                                        >
                                            <X size={14} strokeWidth={2.5} />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <button
                            className="btn-add-tab"
                            onClick={handleAddTab}
                            disabled={tabs.length >= MAX_TABS}
                            title={tabs.length >= MAX_TABS
                                ? `Chỉ được mở tối đa ${MAX_TABS} hóa đơn`
                                : 'Tạo hóa đơn mới'}
                        >
                            <Plus size={24} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                <div className="pos-header-right">
                    {!isReturnTab && (
                        <button className="icon-btn" onClick={handleNewOrder} title="Làm mới đơn hiện tại">
                            <RefreshCcw size={20} />
                        </button>
                    )}
                    <button className="icon-btn" onClick={() => navigate('/admin/dashboard')} title="Trang chủ POS">
                        <Home size={24} />
                    </button>
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

            {/* POS-INFO ERROR BANNER */}
            {posInfoError && (
                <div className="scan-error-banner">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        {posInfoError}
                    </span>
                    <button onClick={() => setPosInfoError(null)} title="Đóng">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* KHÔNG IN ĐƯỢC — đơn vẫn đã lưu */}
            {printError && (
                <div className="scan-error-banner">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        {printError}
                    </span>
                    <button onClick={() => setPrintError(null)} title="Đóng">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="pos-main" style={isReturnTab ? { display: 'none' } : undefined}>

                {/* LEFT COLUMN - CART */}
                <div className="pos-cart-section">
                    <div className="cart-table-wrapper">
                        <table className="cart-table">
                            <thead>
                                <tr>
                                    <th className="col-stt">STT</th>
                                    <th>MÃ SẢN PHẨM</th>
                                    <th>TÊN HÀNG</th>
                                    <th>ĐVT</th>
                                    <th>VỊ TRÍ</th>
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
                                            <td>
                                                <div>{item.name}</div>
                                                {item.stockTotal != null && (
                                                    <div
                                                        className="cart-stock-line"
                                                        title={`Quầy ${Number(item.stockSales ?? 0).toLocaleString('vi-VN')} · Kho ${Number(item.stockWarehouse ?? 0).toLocaleString('vi-VN')}`}
                                                    >
                                                        Tồn kho: {Number(item.stockTotal).toLocaleString('vi-VN')}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {(item.units ?? []).length > 1 ? (
                                                    <select
                                                        className="unit-select"
                                                        value={item.productUnitId ?? ''}
                                                        onChange={(e) => changeUnit(item.id, e.target.value)}
                                                    >
                                                        {item.units.map((u) => (
                                                            <option key={u.id} value={u.id}>
                                                                {u.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    item.unit
                                                )}
                                            </td>
                                            <td>
                                                <LocationPicker
                                                    item={item}
                                                    onToggle={(key) => togglePick(item.id, key)}
                                                />
                                            </td>
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
                                            <td className="text-right">{formatVnd(item.price)}</td>
                                            <td className="text-right font-bold">{formatVnd(item.price * item.qty)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Thanh tác vụ đơn hàng, luôn nằm đáy cột giỏ */}
                    <div className="cart-actions">
                        <button
                            className="cart-action-btn"
                            onClick={() => setHistoryOpen('exchange')}
                            title="Chọn hóa đơn cũ để trả hoặc đổi hàng"
                        >
                            <RotateCcw size={18} />
                            Trả/Đổi hàng
                        </button>
                        <button
                            className="cart-action-btn"
                            onClick={() => setHistoryOpen('history')}
                            title="Xem các hóa đơn đã bán"
                        >
                            <History size={18} />
                            Lịch sử đơn hàng
                        </button>
                        <button
                            className="cart-action-btn"
                            onClick={() => navigate('/admin/orders')}
                            title="Mở trang đơn hàng"
                        >
                            <ClipboardList size={18} />
                            Xem báo cáo
                        </button>
                    </div>

                </div>

                {/* RIGHT COLUMN - PAYMENT */}
                <div className="pos-payment-section">
                    <div className="payment-content">

                        {/* ── Tìm khách hàng ── */}
                        <div className="customer-search">
                            <div className="search-wrapper">
                                <Search className="search-icon" size={18} />
                                <input
                                    type="text"
                                    autoComplete="off"
                                    maxLength={100}
                                    placeholder={
                                        'Tìm khách hàng (tên hoặc số điện thoại)'}
                                    className="customer-input"
                                    value={phone}
                                    disabled={!!customer}
                                    onChange={(e) => {
                                        setPhone(e.target.value);
                                        setShowQuickAdd(false);
                                        setQuickAddError(null);
                                    }}
                                />
                                {showCustomerDropdown && (
                                    <CustomerSearchDropdown
                                        results={customerResults}
                                        loading={customerSearchLoading}
                                        error={customerSearchError}
                                        onSelect={handleCustomerSelect}
                                        onAddNew={handleUserPlus}
                                        onClose={clearCustomerResults}
                                        debtMode={isDebtMode}
                                    />
                                )}
                            </div>

                            {/* Đã chọn khách thì nút này chuyển thành "bỏ chọn" */}
                            {customer ? (
                                <button
                                    className="btn-add-customer btn-add-customer--clear"
                                    title="Bỏ khách hàng khỏi đơn"
                                    onClick={handleRemoveCustomer}
                                >
                                    <X size={20} />
                                </button>
                            ) : (
                                <button
                                    className="btn-add-customer"
                                    title="Thêm khách hàng mới"
                                    onClick={handleUserPlus}
                                    disabled={!canQuickAdd || quickAddLoading}
                                >
                                    <Plus size={20} />
                                </button>
                            )}
                        </div>

                        {/* Khách đã chọn: tên + tình trạng công nợ */}
                        {customer && (
                            <div className={`customer-debt-card customer-debt-card--${customerMeta.cls.replace('debt-dot--', '')}`}>
                                <div className="cdc-head">
                                    <span className={`debt-dot ${customerMeta.cls}`} />
                                    <span className="cdc-name">{customer.fullName}</span>
                                    {customerOverdue && (
                                        <Lock size={14} className="cdc-lock" aria-label="Khách đang nợ quá hạn" />
                                    )}
                                    <span className="cdc-level">{customerMeta.label}</span>

                                </div>
                                {customerSummary && (
                                    <div className="cdc-summary">{customerSummary}</div>
                                )}
                                {debtBlockedReason && (
                                    <div className="cdc-block">
                                        <AlertCircle size={13} />
                                        {debtBlockedReason}
                                    </div>
                                )}
                                {!debtBlockedReason && overdueWarning && (
                                    <div className="cdc-warn">
                                        <AlertCircle size={13} />
                                        {overdueWarning}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="summary-row summary-row--total">
                            <span>
                                Tổng tiền
                                <span className="summary-item-count">({totalItems} mặt hàng)</span>
                            </span>
                            <span className="font-bold">{formatVnd(subtotal)}</span>
                        </div>

                        {/* Discount row */}
                        <div className="summary-row summary-row--divider">
                            <span
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#2563eb' }}
                                onClick={handleDiscountEditToggle}
                                title="Nhấn để nhập giảm giá"
                            >
                                Giảm giá <Pencil size={14} />
                            </span>
                            {discountEditing ? (
                                <input
                                    ref={discountInputRef}
                                    type="number"
                                    min={0}
                                    max={subtotal}
                                    value={discount || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setDiscount(Math.max(0, val));
                                    }}
                                    onBlur={() => setDiscountEditing(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === 'Escape') {
                                            setDiscountEditing(false);
                                        }
                                    }}
                                    className="discount-input"
                                    placeholder="0"
                                />
                            ) : (
                                <span
                                    className="font-bold"
                                    style={{ cursor: 'pointer', color: safeDiscount > 0 ? '#dc2626' : undefined }}
                                    onClick={handleDiscountEditToggle}
                                >
                                    {safeDiscount > 0 ? `- ${formatVnd(safeDiscount)}` : formatVnd(0)}
                                </span>
                            )}
                        </div>
                        <div className="summary-row summary-row--major" style={{ marginTop: '16px' }}>
                            <span className="summary-major-label">Khách phải trả</span>
                            <span className="text-blue-large">{formatVnd(amountDue)}</span>
                        </div>

                        {/* Tiền mặt */}
                        {paymentMethod === 'cash' && (
                            <div className="summary-row summary-row--major">
                                <span className="summary-major-label">Tiền khách đưa</span>
                                <input
                                    type="number"
                                    min={0}
                                    step={1000}
                                    className="cash-given-input"
                                    value={cashGivenInput}
                                    placeholder={amountDue.toLocaleString('vi-VN')}
                                    onChange={(e) => setCashGivenInput(e.target.value)}
                                />
                            </div>
                        )}

                        {paymentMethod === 'cash' && (
                            <div className={`summary-row summary-row--major change-due-row${changeDue > 0 ? '' : ' is-zero'}${changeDue < 0 ? '' : ' summary-row--divider'}`}>
                                <span className="summary-major-label">Tiền thừa trả khách</span>
                                <span className="change-due-amount">
                                    {formatVnd(Math.max(0, changeDue))}
                                </span>
                            </div>
                        )}

                        {paymentMethod === 'cash' && changeDue < 0 && (
                            <div className="summary-row summary-row--major summary-row--divider cash-short-row">
                                <span className="summary-major-label">Khách đưa còn thiếu</span>
                                <span className="change-due-amount">
                                    {formatVnd(Math.abs(changeDue))}
                                </span>
                            </div>
                        )}

                        <div className="payment-methods">
                            <span className="payment-methods-title">Hình thức thanh toán</span>
                            <div className="methods-grid">
                                {PAYMENT_METHODS.map(({ value, label }) => (
                                    <label
                                        key={value}
                                        className={`method-label ${paymentMethod === value ? 'active' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            checked={paymentMethod === value}
                                            onChange={() => setPaymentMethod(value)}
                                        />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Bán nợ */}
                        {isDebtMode && (
                            <div className="debt-form">
                                <div className="debt-form-title">Thông tin ghi nợ</div>

                                <div className="summary-row summary-row--major">
                                    <span className="summary-major-label">Tiền khách đưa</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={amountDue}
                                        step={1000}
                                        className={`cash-given-input${prepaidInvalid ? ' input-error' : ''}`}
                                        value={prepaidInput}
                                        placeholder="0"
                                        onChange={(e) => setPrepaidInput(e.target.value)}
                                    />
                                </div>

                                {prepaidInvalid && (
                                    <div className="debt-form-error">
                                        Tiền khách đưa phải nhỏ hơn {formatMoney(amountDue)}.
                                        Trả đủ thì chọn hình thức tiền mặt hoặc chuyển khoản.
                                    </div>
                                )}

                                <div className="summary-row summary-row--major debt-remaining-row">
                                    <span className="summary-major-label">Khách còn nợ</span>
                                    <span className="debt-remaining-amount">{formatMoney(remainingDebt)}</span>
                                </div>

                                <div className="summary-row">
                                    <span className="summary-major-label">Hạn trả nợ</span>
                                    <input
                                        type="date"
                                        className={`debt-due-input${!dueDate ? ' input-error' : ''}`}
                                        value={dueDate}
                                        min={toDateInput(new Date())}
                                        onChange={(e) => setDueDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {isDebtMode && !customer && (
                            <div className="scan-error-banner" style={{ marginTop: '12px', borderRadius: '4px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={16} />
                                    Đơn nợ phải có khách hàng. Tìm theo số điện thoại hoặc thêm khách mới.
                                </span>
                            </div>
                        )}

                        {locationBlocked && (
                            <div className="scan-error-banner" style={{ marginTop: '12px', borderRadius: '4px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={16} />
                                    Chưa chọn vị trí lấy hàng hoặc các vị trí đã chọn không đủ số lượng.
                                </span>
                            </div>
                        )}

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
                            disabled={submitting || cartItems.length === 0 || locationBlocked || debtBlocked}
                            title={debtBlockedReason ?? undefined}
                            onClick={handleCheckout}
                        >
                            {debtBlocked && isDebtMode && <Lock size={16} />}
                            {submitting ? 'ĐANG XỬ LÝ...' : (isDebtMode ? 'GHI NỢ' : 'THANH TOÁN')}
                        </button>
                    </div>
                </div>
            </div>

            {/* RETURN TABS */}
            {tabs.filter(t => t.type === 'RETURN').map(tab => (
                <div
                    key={tab.id}
                    className={`pos-return-pane${tab.id === activeTabId ? ' is-active' : ''}`}
                >
                    <ExchangeOrder
                        embedded
                        ref={(handle) => {
                            if (handle) returnPaneRefs.current[tab.id] = handle;
                            else delete returnPaneRefs.current[tab.id];
                        }}
                        orderId={tab.orderId}
                        onDone={() => closeTab(tab.id)}
                        onDirtyChange={(dirty) => handleReturnDirtyChange(tab.id, dirty)}
                    />
                </div>
            ))}

            {/* THÊM NHANH KHÁCH HÀNG */}
            {showQuickAdd && !customer && (
                <QuickAddCustomerModal
                    initialName={quickAddPrefill.name}
                    initialPhone={quickAddPrefill.phone}
                    loading={quickAddLoading}
                    error={quickAddError}
                    onSubmit={handleQuickAddSubmit}
                    onClose={handleQuickAddClose}
                />
            )}

            {/* XÁC NHẬN GHI NỢ THÊM — khách đang còn nợ */}
            {debtConfirmOpen && customer && customerMeta && (
                <DebtConfirmModal
                    customer={customer}
                    meta={customerMeta}
                    summary={customerSummary}
                    overdue={customerOverdue}
                    warning={overdueWarning}
                    onConfirm={handleDebtConfirm}
                    onCancel={() => setDebtConfirmOpen(false)}
                />
            )}

            {/* HISTORY MODAL */}
            {historyOpen && (
                <SalesOrderHistoryModal
                    mode={historyOpen}
                    onClose={() => setHistoryOpen(false)}
                    onExchange={(orderId) => {
                        setHistoryOpen(false);
                        handleOpenReturnTab(orderId);
                    }}
                />
            )}

        </div>
    );
};

export default POSScreen;
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { MOCK_AVAILABLE_BATCH_LOCATIONS, MOCK_LOCATIONS } from '../api/mockData';
import InventoryCheckLineTable from '../components/InventoryCheckLineTable';
import {
    InventoryCheckNotePanel,
    InventoryCheckSummaryPanel,
} from '../components/InventoryCheckSidePanels';
import { INVENTORY_CHECK_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/InventoryCheck.css';

function createLineFromBatch(batch) {
    return {
        id: batch.id,
        productCode: batch.productCode,
        productName: batch.productName,
        unit: batch.unit,
        batchCode: batch.batchCode,
        locationLabel: batch.locationLabel,
        systemQty: batch.systemQty,
        actualQty: '',
        importPrice: batch.importPrice,
        note: '',
    };
}

export default function CreateInventoryCheckPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialLocation = searchParams.get('location') ?? 'all';
    const [note, setNote] = useState('');
    const [locationFilter, setLocationFilter] = useState(initialLocation);
    const [lineKeyword, setLineKeyword] = useState('');
    const [lines, setLines] = useState([]);

    const availableBatches = useMemo(() => {
        return MOCK_AVAILABLE_BATCH_LOCATIONS.filter((item) => {
            if (locationFilter === 'all') {
                return true;
            }
            return item.locationLabel === locationFilter;
        });
    }, [locationFilter]);

    const handleAddBatch = (batchId) => {
        const batch = MOCK_AVAILABLE_BATCH_LOCATIONS.find((item) => item.id === batchId);
        if (!batch || lines.some((line) => line.id === batch.id)) {
            return;
        }

        setLines((prev) => [...prev, createLineFromBatch(batch)]);
    };

    const handleAddAllVisible = () => {
        const newLines = availableBatches
            .filter((batch) => !lines.some((line) => line.id === batch.id))
            .map(createLineFromBatch);
        setLines((prev) => [...prev, ...newLines]);
    };

    const handleActualQtyChange = (lineId, value) => {
        setLines((prev) =>
            prev.map((line) =>
                line.id === lineId
                    ? { ...line, actualQty: value === '' ? '' : Number(value) }
                    : line,
            ),
        );
    };

    const handleNoteChange = (lineId, value) => {
        setLines((prev) =>
            prev.map((line) => (line.id === lineId ? { ...line, note: value } : line)),
        );
    };

    const handleSubmit = () => {
        if (lines.length === 0) {
            window.alert('Vui lòng thêm ít nhất một dòng kiểm kê (lô + vị trí).');
            return;
        }

        const hasEmptyActual = lines.some(
            (line) => line.actualQty === '' || line.actualQty === null,
        );
        if (hasEmptyActual) {
            window.alert('Vui lòng nhập số lượng thực tế cho tất cả các dòng.');
            return;
        }

        window.alert('Đã lưu phiếu kiểm kho (mock). Backend sẽ xử lý sau.');
        navigate(INVENTORY_CHECK_ROUTES.list);
    };

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container inventory-check-page inventory-check-create-page">
                        <nav className="inventory-check-breadcrumb" aria-label="Breadcrumb">
                            <Link
                                to={INVENTORY_CHECK_ROUTES.list}
                                className="inventory-check-breadcrumb__link"
                            >
                                Kho hàng
                            </Link>
                            <span className="inventory-check-breadcrumb__sep">›</span>
                            <Link
                                to={INVENTORY_CHECK_ROUTES.list}
                                className="inventory-check-breadcrumb__link"
                            >
                                Kiểm kho
                            </Link>
                            <span className="inventory-check-breadcrumb__sep">›</span>
                            <span className="inventory-check-breadcrumb__current">
                                Tạo phiếu kiểm kho
                            </span>
                        </nav>

                        <header className="inventory-check-detail-header">
                            <div>
                                <h1 className="inventory-page__title">Tạo phiếu kiểm kho</h1>
                                <p className="inventory-page__subtitle">
                                    Kiểm kê theo từng lô tại từng vị trí kệ. Mỗi dòng là một cặp
                                    lô + vị trí.
                                </p>
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={() => navigate(INVENTORY_CHECK_ROUTES.list)}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--primary"
                                    onClick={handleSubmit}
                                >
                                    Lưu phiếu
                                </button>
                            </div>
                        </header>

                        <section className="inventory-check-create-form">
                            <div className="inventory-check-create-form__row">
                                <div className="inventory-check-create-field">
                                    <label className="inventory-check-create-field__label">
                                        Kho kiểm
                                    </label>
                                    <input
                                        type="text"
                                        className="inventory-check-create-field__input"
                                        value="Kho chính - CH01"
                                        readOnly
                                    />
                                </div>
                                <div className="inventory-check-create-field">
                                    <label className="inventory-check-create-field__label">
                                        Lọc theo vị trí kệ
                                    </label>
                                    <select
                                        className="inventory-check-create-field__select"
                                        value={locationFilter}
                                        onChange={(event) => setLocationFilter(event.target.value)}
                                    >
                                        {MOCK_LOCATIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="inventory-check-picker-card">
                            <div className="inventory-check-picker-card__header">
                                <h2 className="inventory-check-picker-card__title">
                                    Chọn lô + vị trí cần kiểm
                                </h2>
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary inventory-btn--sm"
                                    onClick={handleAddAllVisible}
                                >
                                    Thêm tất cả 
                                </button>
                            </div>

                            <div className="inventory-check-picker-list">
                                {availableBatches.map((batch) => {
                                    const isAdded = lines.some((line) => line.id === batch.id);
                                    return (
                                        <div key={batch.id} className="inventory-check-picker-item">
                                            <div className="inventory-check-picker-item__info">
                                                <span className="inventory-check-picker-item__name">
                                                    {batch.productName}
                                                </span>
                                                <span className="inventory-check-picker-item__meta">
                                                    {batch.productCode} · Lô{' '}
                                                    <strong>{batch.batchCode}</strong> · Kệ{' '}
                                                    <strong>{batch.locationLabel}</strong> · Tồn{' '}
                                                    {batch.systemQty} {batch.unit}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                className="inventory-btn inventory-btn--secondary inventory-btn--sm"
                                                disabled={isAdded}
                                                onClick={() => handleAddBatch(batch.id)}
                                            >
                                                {isAdded ? 'Đã thêm' : 'Thêm lô'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <div className="inventory-check-detail-layout">
                            <div className="inventory-check-detail-main">
                                <InventoryCheckLineTable
                                    lines={lines}
                                    keyword={lineKeyword}
                                    onKeywordChange={setLineKeyword}
                                    editable
                                    onActualQtyChange={handleActualQtyChange}
                                    onNoteChange={handleNoteChange}
                                />
                            </div>

                            <aside className="inventory-check-detail-sidebar">
                                <InventoryCheckSummaryPanel lines={lines} />
                                <InventoryCheckNotePanel
                                    note={note}
                                    editable
                                    onChange={setNote}
                                />
                            </aside>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { ChevronDown } from 'lucide-react';
import { createStorageLocation, fetchStorageZones } from '../api';
import { RECEIVING_ZONE_CODE, SHELF_SIZE_OPTIONS, ZONE_TYPE, normalizeZoneType } from '../constants';
import { buildLocationLabel } from '../utils/storageLocationUtils';
import { getApiErrorMessage } from '../../../utils/api-utils';

const EMPTY_FORM = {
    zone: '',
    shelf: '',
    bin: '',
    size: 'MD',
    label: '',
    description: '',
};

function ZoneCombobox({ value, onChange, options, disabled }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const inputRef = useRef(null);

    const filtered = useMemo(() => {
        const q = String(value ?? '').trim().toUpperCase();
        if (!q) return options;
        return options.filter((zone) => zone.includes(q));
    }, [options, value]);

    useEffect(() => {
        if (!open) return undefined;
        const onDocMouseDown = (event) => {
            if (wrapRef.current && !wrapRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDocMouseDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onDocMouseDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const selectZone = (zone) => {
        onChange(zone);
        setOpen(false);
        inputRef.current?.focus();
    };

    return (
        <div className="storage-zone-combobox" ref={wrapRef}>
            <div className="storage-zone-combobox__control">
                <Form.Control
                    ref={inputRef}
                    type="text"
                    name="zone"
                    value={value}
                    disabled={disabled}
                    onChange={(event) => {
                        onChange(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder=""
                    maxLength={50}
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={open}
                    role="combobox"
                />
                <button
                    type="button"
                    className="storage-zone-combobox__toggle"
                    disabled={disabled || options.length === 0}
                    aria-label="Hiện danh sách khu"
                    tabIndex={-1}
                    onClick={() => {
                        setOpen((prev) => !prev);
                        inputRef.current?.focus();
                    }}
                >
                    <ChevronDown size={16} />
                </button>
            </div>

            {open && (
                <div className="storage-zone-combobox__panel" role="listbox">
                    {filtered.length === 0 ? (
                        <div className="storage-zone-combobox__empty">
                            {options.length === 0
                                ? 'Chưa có khu nào — nhập mã khu mới'
                                : `Không khớp “${value}” — vẫn có thể dùng mã này`}
                        </div>
                    ) : (
                        filtered.map((zone) => (
                            <button
                                key={zone}
                                type="button"
                                role="option"
                                className={[
                                    'storage-zone-combobox__option',
                                    String(value).trim().toUpperCase() === zone
                                        ? 'storage-zone-combobox__option--active'
                                        : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => selectZone(zone)}
                            >
                                Khu {zone}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default function CreateStorageLocationModal({ show, onHide, onSuccess, existingZones = [] }) {
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [labelTouched, setLabelTouched] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [apiZones, setApiZones] = useState([]);

    const suggestedLabel = useMemo(() => {
        if (!formData.shelf.trim() || !formData.bin.trim()) {
            return '';
        }
        return buildLocationLabel({
            zone: formData.zone,
            shelf: formData.shelf,
            bin: formData.bin,
        });
    }, [formData.zone, formData.shelf, formData.bin]);

    useEffect(() => {
        if (!labelTouched && suggestedLabel) {
            setFormData((prev) => ({
                ...prev,
                label: suggestedLabel,
            }));
        }
    }, [suggestedLabel, labelTouched]);

    useEffect(() => {
        if (!show) return undefined;
        let cancelled = false;
        fetchStorageZones()
            .then((zones) => {
                if (cancelled) return;
                const codes = (zones ?? [])
                    .filter((z) => normalizeZoneType(z?.zoneType) !== ZONE_TYPE.RETURN_HOLD)
                    .map((z) => String(z?.code ?? '').trim().toUpperCase())
                    .filter((code) => code && code !== RECEIVING_ZONE_CODE);
                setApiZones(codes);
            })
            .catch(() => {
                if (!cancelled) setApiZones([]);
            });
        return () => {
            cancelled = true;
        };
    }, [show]);

    const zoneOptions = useMemo(() => {
        const zones = new Set();
        existingZones.forEach((zone) => {
            const code = String(zone ?? '').trim().toUpperCase();
            if (code && code !== RECEIVING_ZONE_CODE) zones.add(code);
        });
        apiZones.forEach((zone) => {
            const code = String(zone ?? '').trim().toUpperCase();
            if (code && code !== RECEIVING_ZONE_CODE) zones.add(code);
        });
        return [...zones].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [existingZones, apiZones]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        if (name === 'label') {
            setLabelTouched(true);
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleZoneChange = (value) => {
        setFormData((prev) => ({ ...prev, zone: value }));
    };

    const handleHide = () => {
        setFormData(EMPTY_FORM);
        setLabelTouched(false);
        setError(null);
        onHide();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const shelf = formData.shelf.trim();
        const bin = formData.bin.trim();
        const label = (formData.label || suggestedLabel).trim();

        const payload = {
            zone: formData.zone.trim().toUpperCase(),
            shelf: shelf || undefined,
            bin: bin || undefined,
            size: formData.size || 'MD',
            label: label || undefined,
            description: formData.description.trim() || undefined,
        };

        if (!payload.zone) {
            setError('Vui lòng nhập khu vực.');
            setIsSubmitting(false);
            return;
        }
        if (Boolean(shelf) !== Boolean(bin)) {
            setError('Tầng và số ô phải nhập cùng nhau hoặc để trống cả hai.');
            setIsSubmitting(false);
            return;
        }
        if (shelf && !/^[1-9]\d*$/.test(shelf)) {
            setError('Tầng phải là số nguyên dương (1, 2, 3...).');
            setIsSubmitting(false);
            return;
        }
        if (bin && !/^[1-9]\d*$/.test(bin)) {
            setError('Số ô phải là số nguyên dương, bắt đầu từ 1 trên mỗi tầng.');
            setIsSubmitting(false);
            return;
        }
        if (!payload.label) {
            setError('Vui lòng nhập mã vị trí (ví dụ: QUAY-1, BAN-NUOC).');
            setIsSubmitting(false);
            return;
        }

        try {
            const created = await createStorageLocation(payload);
            onSuccess?.(created);
            handleHide();
        } catch (submitError) {
            setError(
                getApiErrorMessage(submitError, 'Không thể tạo vị trí kho. Vui lòng thử lại.'),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={handleHide} centered className="storage-location-modal">
            <Modal.Header closeButton>
                <Modal.Title>Thêm vị trí kho</Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}

                    <div className="storage-location-modal__row">
                        <Form.Group className="storage-location-modal__field" controlId="locationZone">
                            <Form.Label>Khu vực</Form.Label>
                            <ZoneCombobox
                                value={formData.zone}
                                onChange={handleZoneChange}
                                options={zoneOptions}
                                disabled={isSubmitting}
                            />
                        </Form.Group>

                        <Form.Group className="storage-location-modal__field" controlId="locationShelf">
                            <Form.Label>Tầng</Form.Label>
                            <Form.Control
                                type="number"
                                min={1}
                                step={1}
                                name="shelf"
                                value={formData.shelf}
                                onChange={handleChange}
                                placeholder="Tuỳ chọn"
                            />
                        </Form.Group>
                    </div>

                    <div className="storage-location-modal__row">
                        <Form.Group className="storage-location-modal__field" controlId="locationBin">
                            <Form.Label>Số ô</Form.Label>
                            <Form.Control
                                type="number"
                                min={1}
                                step={1}
                                name="bin"
                                value={formData.bin}
                                onChange={handleChange}
                                placeholder="Tuỳ chọn"
                            />
                        </Form.Group>

                        <Form.Group className="storage-location-modal__field" controlId="locationSize">
                            <Form.Label>Kích thước</Form.Label>
                            <Form.Select
                                name="size"
                                value={formData.size}
                                onChange={handleChange}
                            >
                                {SHELF_SIZE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </div>

                    <Form.Group className="mb-3" controlId="locationLabel">
                        <Form.Label>Mã vị trí</Form.Label>
                        <Form.Control
                            type="text"
                            name="label"
                            value={formData.label}
                            onChange={handleChange}
                            placeholder="Ví dụ: QUAY-1, BAN-NUOC"
                            maxLength={50}
                        />
                        {!labelTouched && suggestedLabel && (
                            <Form.Text className="text-muted">
                                Tự động gợi ý: {suggestedLabel}
                            </Form.Text>
                        )}
                    </Form.Group>

                    <Form.Group controlId="locationDescription">
                        <Form.Label>Mô tả</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Ví dụ: Quầy nước ngọt gần lối vào"
                            maxLength={255}
                        />
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={handleHide} disabled={isSubmitting}>
                        Hủy
                    </Button>
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                />{' '}
                                Đang lưu...
                            </>
                        ) : (
                            'Thêm vị trí'
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

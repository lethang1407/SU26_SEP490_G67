import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { createStorageRack, fetchStorageZones } from '../api';
import { RECEIVING_ZONE_CODE, RETURN_HOLD_ZONE_CODE, SHELF_SIZE_OPTIONS, ZONE_TYPE, normalizeZoneType } from '../constants';
import { getApiErrorMessage } from '../../../utils/api-utils';

const EMPTY_FORM = {
    zone: '',
    title: '',
    floorCount: '1',
    binCount: '1',
    size: 'MD',
    description: '',
};

const MAX_FLOOR = 10;
const MAX_BIN = 10;

export default function CreateStorageLocationModal({ show, onHide, onSuccess, existingZones = [] }) {
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [apiZones, setApiZones] = useState([]);

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

    const takenZones = useMemo(() => {
        const zones = new Set();
        existingZones.forEach((zone) => {
            const code = String(zone ?? '').trim().toUpperCase();
            if (code) zones.add(code);
        });
        apiZones.forEach((zone) => {
            const code = String(zone ?? '').trim().toUpperCase();
            if (code) zones.add(code);
        });
        zones.add(RECEIVING_ZONE_CODE);
        zones.add(RETURN_HOLD_ZONE_CODE);
        return zones;
    }, [existingZones, apiZones]);

    const previewCount = useMemo(() => {
        const floors = Number(formData.floorCount);
        const bins = Number(formData.binCount);
        if (!Number.isFinite(floors) || !Number.isFinite(bins) || floors < 1 || bins < 1) {
            return 0;
        }
        return floors * bins;
    }, [formData.floorCount, formData.binCount]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        let nextValue = value;
        if (name === 'zone') {
            nextValue = value.toUpperCase();
        }
        if ((name === 'floorCount' || name === 'binCount') && nextValue !== '') {
            const num = Number(nextValue);
            const max = name === 'floorCount' ? MAX_FLOOR : MAX_BIN;
            if (Number.isFinite(num) && num > max) {
                nextValue = String(max);
            }
        }
        setFormData((prev) => ({ ...prev, [name]: nextValue }));
    };

    const handleHide = () => {
        setFormData(EMPTY_FORM);
        setError(null);
        onHide();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const zone = formData.zone.trim().toUpperCase();
        const floorCount = Number(formData.floorCount);
        const binCount = Number(formData.binCount);

        if (!zone) {
            setError('Vui lòng nhập mã khu.');
            setIsSubmitting(false);
            return;
        }
        if (takenZones.has(zone)) {
            setError('Mã khu đã tồn tại. Hãy dùng mã khác hoặc mở rộng trong chi tiết khu.');
            setIsSubmitting(false);
            return;
        }
        if (!Number.isInteger(floorCount) || floorCount < 1 || floorCount > MAX_FLOOR) {
            setError(`Số tầng phải từ 1 đến ${MAX_FLOOR}.`);
            setIsSubmitting(false);
            return;
        }
        if (!Number.isInteger(binCount) || binCount < 1 || binCount > MAX_BIN) {
            setError(`Số ô mỗi tầng phải từ 1 đến ${MAX_BIN}.`);
            setIsSubmitting(false);
            return;
        }

        const payload = {
            zone,
            title: formData.title.trim() || undefined,
            floorCount,
            binCount,
            size: formData.size || 'MD',
            description: formData.description.trim() || undefined,
        };

        try {
            const created = await createStorageRack(payload);
            onSuccess?.(created);
            handleHide();
        } catch (submitError) {
            setError(
                getApiErrorMessage(submitError, 'Không thể tạo khu kệ. Vui lòng thử lại.'),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={handleHide} centered className="storage-location-modal">
            <Modal.Header closeButton>
                <Modal.Title>Thêm khu kệ</Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}

                    <div className="storage-location-modal__row">
                        <Form.Group className="storage-location-modal__field" controlId="rackZone">
                            <Form.Label>Mã khu</Form.Label>
                            <Form.Control
                                type="text"
                                name="zone"
                                value={formData.zone}
                                onChange={handleChange}
                                placeholder="Ví dụ: NM, A, B"
                                maxLength={50}
                                disabled={isSubmitting}
                                autoComplete="off"
                            />
                        </Form.Group>

                        <Form.Group className="storage-location-modal__field" controlId="rackTitle">
                            <Form.Label>Tên khu</Form.Label>
                            <Form.Control
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Ví dụ: Nước mắm"
                                maxLength={200}
                                disabled={isSubmitting}
                            />
                        </Form.Group>
                    </div>

                    <div className="storage-location-modal__row">
                        <Form.Group className="storage-location-modal__field" controlId="rackFloorCount">
                            <Form.Label>Số tầng</Form.Label>
                            <Form.Control
                                type="number"
                                min={1}
                                max={MAX_FLOOR}
                                step={1}
                                name="floorCount"
                                value={formData.floorCount}
                                onChange={handleChange}
                                disabled={isSubmitting}
                            />
                            <Form.Text className="text-muted">Tối đa {MAX_FLOOR} tầng</Form.Text>
                        </Form.Group>

                        <Form.Group className="storage-location-modal__field" controlId="rackBinCount">
                            <Form.Label>Số ô mỗi tầng</Form.Label>
                            <Form.Control
                                type="number"
                                min={1}
                                max={MAX_BIN}
                                step={1}
                                name="binCount"
                                value={formData.binCount}
                                onChange={handleChange}
                                disabled={isSubmitting}
                            />
                            <Form.Text className="text-muted">Tối đa {MAX_BIN} ô/tầng</Form.Text>
                        </Form.Group>
                    </div>

                    <Form.Group className="mb-3" controlId="rackSize">
                        <Form.Label>Kích thước ô</Form.Label>
                        <Form.Select
                            name="size"
                            value={formData.size}
                            onChange={handleChange}
                            disabled={isSubmitting}
                        >
                            {SHELF_SIZE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="rackDescription">
                        <Form.Label>Mô tả</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Tuỳ chọn"
                            maxLength={255}
                            disabled={isSubmitting}
                        />
                    </Form.Group>

                    {previewCount > 0 && (
                        <Alert variant="light" className="mb-0">
                            Sẽ tạo {formData.floorCount} tầng × {formData.binCount} ô ={' '}
                            <strong>{previewCount}</strong> vị trí
                            {formData.zone.trim()
                                ? ` (${formData.zone.trim().toUpperCase()}-T1-O1 …)`
                                : ''}
                            .
                        </Alert>
                    )}
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
                            'Thêm khu kệ'
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

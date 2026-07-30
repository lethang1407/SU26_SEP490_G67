import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { createStorageLocation } from '../api';
import { buildLocationLabel } from '../utils/storageLocationUtils';
import { getApiErrorMessage } from '../../../utils/api-utils';

const EMPTY_FORM = {
    zone: '',
    aisle: '',
    shelf: '',
    bin: '',
    label: '',
    description: '',
};

export default function CreateStorageLocationModal({ show, onHide, onSuccess, existingZones = [] }) {
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [labelTouched, setLabelTouched] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const suggestedLabel = useMemo(
        () =>
            buildLocationLabel({
                zone: formData.zone,
                aisle: formData.aisle,
                shelf: formData.shelf,
                bin: formData.bin,
            }),
        [formData.zone, formData.aisle, formData.shelf, formData.bin],
    );

    useEffect(() => {
        if (!labelTouched) {
            setFormData((prev) => ({
                ...prev,
                label: suggestedLabel,
            }));
        }
    }, [suggestedLabel, labelTouched]);

    const zoneSuggestions = useMemo(() => {
        const zones = new Set(existingZones.map((zone) => zone?.trim().toUpperCase()).filter(Boolean));
        ['A', 'B', 'C'].forEach((zone) => zones.add(zone));
        return [...zones].sort();
    }, [existingZones]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        if (name === 'label') {
            setLabelTouched(true);
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
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

        const payload = {
            zone: formData.zone.trim().toUpperCase(),
            label: (formData.label || suggestedLabel).trim(),
            aisle: formData.aisle.trim() || undefined,
            shelf: formData.shelf.trim() || undefined,
            bin: formData.bin.trim() || undefined,
            description: formData.description.trim() || undefined,
        };

        if (!payload.zone) {
            setError('Vui lòng nhập khu vực.');
            setIsSubmitting(false);
            return;
        }

        if (!payload.label) {
            setError('Vui lòng nhập mã vị trí hoặc điền hàng/kệ để tự sinh mã.');
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

                    <p className="storage-location-modal__hint">
                        Mã vị trí gợi ý theo định dạng <strong>Khu-Hàng-Kệ-Ô</strong> (ví dụ:
                        A-01-02).
                    </p>

                    <div className="storage-location-modal__row">
                        <Form.Group className="storage-location-modal__field" controlId="locationZone">
                            <Form.Label>
                                Khu vực <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                type="text"
                                name="zone"
                                list="storage-location-zone-options"
                                value={formData.zone}
                                onChange={handleChange}
                                placeholder="A"
                                maxLength={50}
                                required
                            />
                            <datalist id="storage-location-zone-options">
                                {zoneSuggestions.map((zone) => (
                                    <option key={zone} value={zone} />
                                ))}
                            </datalist>
                        </Form.Group>

                        <Form.Group className="storage-location-modal__field" controlId="locationAisle">
                            <Form.Label>Hàng</Form.Label>
                            <Form.Control
                                type="text"
                                name="aisle"
                                value={formData.aisle}
                                onChange={handleChange}
                                placeholder="01"
                                maxLength={20}
                            />
                        </Form.Group>
                    </div>

                    <div className="storage-location-modal__row">
                        <Form.Group className="storage-location-modal__field" controlId="locationShelf">
                            <Form.Label>Kệ</Form.Label>
                            <Form.Control
                                type="text"
                                name="shelf"
                                value={formData.shelf}
                                onChange={handleChange}
                                placeholder="02"
                                maxLength={20}
                            />
                        </Form.Group>

                        <Form.Group className="storage-location-modal__field" controlId="locationBin">
                            <Form.Label>Ô (nếu có)</Form.Label>
                            <Form.Control
                                type="text"
                                name="bin"
                                value={formData.bin}
                                onChange={handleChange}
                                placeholder="03"
                                maxLength={20}
                            />
                        </Form.Group>
                    </div>

                    <Form.Group className="mb-3" controlId="locationLabel">
                        <Form.Label>
                            Mã vị trí <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                            type="text"
                            name="label"
                            value={formData.label}
                            onChange={handleChange}
                            placeholder="A-01-02"
                            maxLength={50}
                            required
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
                            placeholder="Ví dụ: Kệ nước ngọt, tầng mắt"
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

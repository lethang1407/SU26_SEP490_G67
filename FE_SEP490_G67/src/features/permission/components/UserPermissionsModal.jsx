import { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { ShieldCheck } from 'lucide-react';
import { getAllPermissions, getUserPermissions, updateUserPermissions } from '../api';

export default function UserPermissionsModal({ show, onHide, user }) {
    const [allPermissions, setAllPermissions] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    useEffect(() => {
        if (show && user?.id) {
            fetchData();
        }
    }, [show, user?.id]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const [perms, userPerms] = await Promise.all([
                getAllPermissions(),
                getUserPermissions(user.id),
            ]);
            setAllPermissions(perms || []);
            setSelectedPermissions(new Set(userPerms || []));
        } catch (err) {
            setError('Không thể tải danh sách quyền. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (code) => {
        setSelectedPermissions((prev) => {
            const next = new Set(prev);
            if (next.has(code)) {
                next.delete(code);
            } else {
                next.add(code);
            }
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccessMsg(null);
        try {
            await updateUserPermissions(user.id, Array.from(selectedPermissions));
            setSuccessMsg('Cập nhật quyền tùy chỉnh thành công!');
            setTimeout(() => {
                onHide();
            }, 1000);
        } catch (err) {
            setError('Cập nhật quyền thất bại.');
        } finally {
            setSaving(false);
        }
    };

    // Group permissions by module
    const groupedPermissions = allPermissions.reduce((acc, perm) => {
        const module = perm.module || 'KHÁC';
        if (!acc[module]) acc[module] = [];
        acc[module].push(perm);
        return acc;
    }, {});

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title className="d-flex align-items-center gap-2">
                    <ShieldCheck className="text-primary" size={22} />
                    <span>Phân quyền chi tiết: <strong>{user?.name || user?.fullName || user?.username}</strong></span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {successMsg && <Alert variant="success">{successMsg}</Alert>}

                {loading ? (
                    <div className="text-center p-4">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2 text-muted">Đang tải cấu hình quyền...</p>
                    </div>
                ) : (
                    <div>
                        <p className="text-muted small mb-3">
                            Tích chọn các quyền riêng biệt cho tài khoản này. (Mỗi nhân viên dù cùng vai trò vẫn có thể có tập quyền khác nhau).
                        </p>
                        {Object.entries(groupedPermissions).map(([moduleName, perms]) => (
                            <div key={moduleName} className="mb-4 border rounded p-3 bg-light">
                                <h6 className="fw-bold text-uppercase text-primary mb-2 d-flex align-items-center justify-content-between">
                                    <span>Phân khu: {moduleName}</span>
                                    <Badge bg="secondary">{perms.length} quyền</Badge>
                                </h6>
                                <div className="row g-2">
                                    {perms.map((perm) => {
                                        const isChecked = selectedPermissions.has(perm.code);
                                        return (
                                            <div key={perm.code} className="col-md-6">
                                                <div className={`p-2 border rounded bg-white ${isChecked ? 'border-primary' : ''}`}>
                                                    <Form.Check
                                                        type="checkbox"
                                                        id={`perm-${perm.code}`}
                                                        label={
                                                            <div>
                                                                <strong className="d-block text-dark">{perm.name || perm.code}</strong>
                                                                <small className="text-muted">{perm.code}</small>
                                                            </div>
                                                        }
                                                        checked={isChecked}
                                                        onChange={() => handleToggle(perm.code)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={saving}>
                    Hủy
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={loading || saving}>
                    {saving ? 'Đang lưu...' : 'Lưu cấu hình quyền'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

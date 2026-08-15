import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Badge, Spinner, Alert } from 'react-bootstrap';
import { Plus, Trash2, Edit, RefreshCw, KeyRound } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiEndpointRules, saveApiEndpointRule, deleteApiEndpointRule, getAllPermissions } from '../api';
import '../../../css/AdminDashboard.css';

export default function ApiPermissionsPage() {
    const [rules, setRules] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [formRule, setFormRule] = useState({
        httpMethod: 'GET',
        urlPattern: '',
        permissionCode: '',
        description: '',
        isActive: true,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        setError(null);
        try {
            const [data, perms] = await Promise.all([
                getApiEndpointRules(),
                getAllPermissions(),
            ]);
            setRules(data || []);
            setPermissions(perms || []);
        } catch (err) {
            setError('Không thể tải cấu hình phân quyền API.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingRule(null);
        setFormRule({
            httpMethod: 'GET',
            urlPattern: '/api/',
            permissionCode: permissions[0]?.code || '',
            description: '',
            isActive: true,
        });
        setShowModal(true);
    };

    const handleOpenEdit = (rule) => {
        setEditingRule(rule);
        setFormRule({
            httpMethod: rule.httpMethod,
            urlPattern: rule.urlPattern,
            permissionCode: rule.permissionCode,
            description: rule.description || '',
            isActive: rule.isActive ?? true,
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa quy tắc phân quyền API này?')) return;
        try {
            await deleteApiEndpointRule(id);
            fetchRules();
        } catch (err) {
            alert('Xóa thất bại.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await saveApiEndpointRule({
                id: editingRule?.id,
                ...formRule,
            });
            setShowModal(false);
            fetchRules();
        } catch (err) {
            alert('Lưu cấu hình API thất bại.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="admin-content">
            <AdminHeader />
            <main className="admin-main">
                <div className="dashboard-container">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h1 className="h3 font-weight-bold">Quản lý Phân quyền Động API (Database)</h1>
                            <p className="text-muted small">Cấu hình ánh xạ giữa HTTP Method + Đường dẫn API và Mã quyền truy cập.</p>
                        </div>
                        <div className="d-flex gap-2">
                            <Button variant="outline-secondary" onClick={fetchRules} className="d-flex align-items-center gap-1">
                                <RefreshCw size={16} /> Làm mới
                            </Button>
                            <Button variant="primary" onClick={handleOpenCreate} className="d-flex align-items-center gap-1">
                                <Plus size={16} /> Thêm quy tắc API
                            </Button>
                        </div>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    {loading ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <div className="bg-white border rounded shadow-sm">
                            <Table responsive hover className="mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>HTTP Method</th>
                                        <th>URL Pattern</th>
                                        <th>Mã Permission Yêu cầu</th>
                                        <th>Mô tả</th>
                                        <th>Trạng thái</th>
                                        <th className="text-end">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rules.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center text-muted py-4">
                                                Chưa có quy tắc API nào.
                                            </td>
                                        </tr>
                                    ) : (
                                        rules.map((rule) => (
                                            <tr key={rule.id}>
                                                <td>
                                                    <Badge bg={
                                                        rule.httpMethod === 'GET' ? 'success' :
                                                        rule.httpMethod === 'POST' ? 'primary' :
                                                        rule.httpMethod === 'PUT' ? 'warning' : 'danger'
                                                    }>
                                                        {rule.httpMethod}
                                                    </Badge>
                                                </td>
                                                <td><code>{rule.urlPattern}</code></td>
                                                <td>
                                                    <Badge bg="info" className="text-dark">
                                                        <KeyRound size={12} className="me-1" />
                                                        {rule.permissionCode}
                                                    </Badge>
                                                </td>
                                                <td>{rule.description || '-'}</td>
                                                <td>
                                                    <Badge bg={rule.isActive ? 'success' : 'secondary'}>
                                                        {rule.isActive ? 'Hoạt động' : 'Tắt'}
                                                    </Badge>
                                                </td>
                                                <td className="text-end">
                                                    <Button variant="link" size="sm" onClick={() => handleOpenEdit(rule)}>
                                                        <Edit size={16} />
                                                    </Button>
                                                    <Button variant="link" size="sm" className="text-danger" onClick={() => handleDelete(rule.id)}>
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </div>
            </main>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editingRule ? 'Sửa quy tắc API' : 'Thêm quy tắc API mới'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>HTTP Method</Form.Label>
                            <Form.Select
                                value={formRule.httpMethod}
                                onChange={(e) => setFormRule({ ...formRule, httpMethod: e.target.value })}
                            >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                                <option value="PATCH">PATCH</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>URL Pattern (AntMatcher format)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="/api/products/**"
                                value={formRule.urlPattern}
                                onChange={(e) => setFormRule({ ...formRule, urlPattern: e.target.value })}
                                required
                            />
                            <Form.Text className="text-muted">Ví dụ: /api/products/** hoặc /api/customers/*</Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Permission Code</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="PRODUCT:VIEW"
                                value={formRule.permissionCode}
                                onChange={(e) => setFormRule({ ...formRule, permissionCode: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Mô tả API</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Mô tả công dụng của API này"
                                value={formRule.description}
                                onChange={(e) => setFormRule({ ...formRule, description: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="switch"
                                id="active-switch"
                                label="Kích hoạt quy tắc này"
                                checked={formRule.isActive}
                                onChange={(e) => setFormRule({ ...formRule, isActive: e.target.checked })}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Hủy</Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? 'Đang lưu...' : 'Lưu quy tắc'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
}

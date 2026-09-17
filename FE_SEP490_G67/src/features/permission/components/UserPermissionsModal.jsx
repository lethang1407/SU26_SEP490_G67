import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Spinner, Alert } from 'react-bootstrap';
import {
  ShieldCheck,
  ShoppingCart,
  Package,
  Truck,
  Users,
  Briefcase,
  BarChart3,
  Search,
  X,
  UserCheck,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { getAllPermissions, getUserPermissions, updateUserPermissions } from '../api';
import {
  PERMISSION_MODULES,
  PERMISSION_DICTIONARY,
  ROLE_TEMPLATES,
  getPermissionMeta,
} from '../constants/permissionDictionary';
import '../../../css/UserPermissionsModal.css';

const MODULE_ICONS = {
  pos: ShoppingCart,
  warehouse: Package,
  import_supplier: Truck,
  customer_debt: Users,
  staff_store: Briefcase,
  audit: BarChart3,
};

export default function UserPermissionsModal({ show, onHide, user }) {
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState('CUSTOM');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Helper so sánh 2 tập quyền xem có khớp với 1 vai trò mẫu nào không
  const detectMatchingTemplate = useCallback((currentSet, allDictCodes) => {
    if (currentSet.size === allDictCodes.length) {
      return 'FULL_ACCESS';
    }
    for (const tpl of ROLE_TEMPLATES) {
      if (tpl.id === 'CUSTOM' || tpl.id === 'FULL_ACCESS') continue;
      if (
        tpl.permissions.length === currentSet.size &&
        tpl.permissions.every((p) => currentSet.has(p))
      ) {
        return tpl.id;
      }
    }
    return 'CUSTOM';
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const [perms, userPerms] = await Promise.all([
        getAllPermissions(),
        getUserPermissions(user.id),
      ]);

      const effectiveAll = Array.isArray(perms) && perms.length > 0
        ? perms
        : Object.keys(PERMISSION_DICTIONARY).map((code) => ({
          code,
          module: PERMISSION_DICTIONARY[code].module,
        }));

      setAllPermissions(effectiveAll);
      const userPermSet = new Set(userPerms || []);
      setSelectedPermissions(userPermSet);

      const allCodes = Object.keys(PERMISSION_DICTIONARY);
      setActiveTemplateId(detectMatchingTemplate(userPermSet, allCodes));
    } catch (err) {
      console.error('Lỗi khi tải cấu hình quyền:', err);
      setError('Không thể tải danh sách quyền. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, detectMatchingTemplate]);

  useEffect(() => {
    if (show && user?.id) {
      fetchData();
      setActiveTab('all');
      setSearchQuery('');
    }
  }, [show, user?.id, fetchData]);

  // Xử lý bật/tắt 1 quyền đơn lẻ
  const handleTogglePermission = (code) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      const allCodes = Object.keys(PERMISSION_DICTIONARY);
      setActiveTemplateId(detectMatchingTemplate(next, allCodes));
      return next;
    });
  };

  // Áp dụng vai trò mẫu (Role Template - One-click assign)
  const handleSelectTemplate = (templateId) => {
    setActiveTemplateId(templateId);
    if (templateId === 'CUSTOM') return;

    const tpl = ROLE_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      setSelectedPermissions(new Set(tpl.permissions));
      setSuccessMsg(`Đã áp dụng: ${tpl.name}`);
      setTimeout(() => setSuccessMsg(null), 2500);
    }
  };

  // Bật / Tắt tất cả quyền trong phạm vi toàn bộ hệ thống
  const handleToggleAllGlobal = (enable) => {
    if (enable) {
      const allCodes = Object.keys(PERMISSION_DICTIONARY);
      setSelectedPermissions(new Set(allCodes));
      setActiveTemplateId('FULL_ACCESS');
    } else {
      setSelectedPermissions(new Set());
      setActiveTemplateId('CUSTOM');
    }
  };

  // Bật / Tắt tất cả quyền trong 1 Module cụ thể
  const handleToggleModule = (moduleId, enable) => {
    const modulePermCodes = Object.values(PERMISSION_DICTIONARY)
      .filter((p) => p.module === moduleId)
      .map((p) => p.code);

    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      modulePermCodes.forEach((code) => {
        if (enable) {
          next.add(code);
        } else {
          next.delete(code);
        }
      });
      const allCodes = Object.keys(PERMISSION_DICTIONARY);
      setActiveTemplateId(detectMatchingTemplate(next, allCodes));
      return next;
    });
  };

  // Lưu cấu hình quyền lên Backend
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await updateUserPermissions(user.id, Array.from(selectedPermissions));
      setSuccessMsg('Đã cập nhật cấu hình phân quyền thành công!');
      setTimeout(() => {
        onHide();
      }, 900);
    } catch (err) {
      console.error('Lỗi khi lưu phân quyền:', err);
      setError(
        err.response?.data?.message || 'Cập nhật phân quyền thất bại. Vui lòng kiểm tra lại kết nối.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Gom nhóm danh sách quyền theo Module và lọc theo Search Query
  const groupedData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return PERMISSION_MODULES.map((mod) => {
      const permsInMod = Object.values(PERMISSION_DICTIONARY).filter(
        (p) => p.module === mod.id
      );

      const filteredPerms = permsInMod.filter((p) => {
        if (!query) return true;
        const matchTitle = p.title.toLowerCase().includes(query);
        const matchDesc = p.description.toLowerCase().includes(query);
        const matchCode = p.code.toLowerCase().includes(query);
        const matchModule = mod.name.toLowerCase().includes(query);
        return matchTitle || matchDesc || matchCode || matchModule;
      });

      const enabledCount = permsInMod.filter((p) => selectedPermissions.has(p.code)).length;

      return {
        ...mod,
        totalCount: permsInMod.length,
        enabledCount,
        perms: filteredPerms,
      };
    });
  }, [searchQuery, selectedPermissions]);

  // Tổng số quyền đang bật
  const totalEnabled = selectedPermissions.size;
  const totalAll = Object.keys(PERMISSION_DICTIONARY).length;
  const progressPercent = totalAll > 0 ? Math.round((totalEnabled / totalAll) * 100) : 0;

  // Lọc theo Tab đang chọn
  const displayedModules = useMemo(() => {
    if (activeTab === 'all') {
      return groupedData.filter((m) => m.perms.length > 0);
    }
    return groupedData.filter((m) => m.id === activeTab && m.perms.length > 0);
  }, [activeTab, groupedData]);

  const staffName = user?.name || user?.fullName || user?.username || 'Nhân viên';
  const staffPhone = user?.phone || user?.phoneNumber || '';
  const staffRole = Array.isArray(user?.roles) ? user.roles[0] : (user?.role || 'STAFF');

  return (
    <Modal
      show={show}
      onHide={onHide}
      dialogClassName="perm-modal-dialog"
      contentClassName="perm-modal-content"
      centered
    >
      {/* ─── 1. Header Profile Banner ─── */}
      <div className="perm-modal-header">
        <div className="perm-profile-card">
          <div className="perm-profile-info">
            <div className="perm-profile-avatar">
              {staffName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h5 className="perm-profile-name">{staffName}</h5>
              <div className="perm-profile-meta">
                {staffPhone && <span>📞 {staffPhone}</span>}
                {user?.username && <span>• @{user.username}</span>}
                <span className="perm-role-tag">
                  <ShieldCheck size={13} />
                  {staffRole}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onHide}
            aria-label="Đóng"
          />
        </div>
      </div>

      {/* ─── 2. Control Bar: Role Template Selector & Search ─── */}
      <div className="perm-control-bar">
        <div className="perm-template-group">
          <label className="perm-template-label">
            <UserCheck size={15} className="text-primary" />
            Vai trò mẫu (Gán nhanh 1-chạm):
          </label>
          <select
            className="perm-template-select"
            value={activeTemplateId}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            disabled={loading || saving}
          >
            {ROLE_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="perm-search-wrapper">
          <Search size={15} className="perm-search-icon" />
          <input
            type="text"
            className="perm-search-input"
            placeholder="Tìm theo chức năng (bán hàng, kho, nợ...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading || saving}
          />
          {searchQuery && (
            <button
              type="button"
              className="perm-search-clear"
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ─── 3. Overview Summary Meter ─── */}
      <div className="perm-summary-meter">
        <div className="perm-progress-info">
          <div className="perm-progress-count">
            Đã cấp: <strong>{totalEnabled}</strong> / {totalAll} quyền ({progressPercent}%)
          </div>
          <div className="perm-progress-track">
            <div
              className="perm-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="perm-quick-actions">
          <button
            type="button"
            className="perm-quick-btn is-primary"
            onClick={() => handleToggleAllGlobal(true)}
            disabled={loading || saving}
            title="Bật toàn bộ 32 quyền cho nhân viên này"
          >
            Bật tất cả
          </button>
          <button
            type="button"
            className="perm-quick-btn"
            onClick={() => handleToggleAllGlobal(false)}
            disabled={loading || saving}
            title="Tắt toàn bộ quyền"
          >
            Tắt tất cả
          </button>
        </div>
      </div>

      {/* ─── 4. Module Tabs Navigation ─── */}
      <div className="perm-tabs-container">
        <button
          type="button"
          className={`perm-tab-btn ${activeTab === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Layers size={14} />
          Tất cả phân khu
          <span className="perm-tab-badge">{totalEnabled}/{totalAll}</span>
        </button>

        {groupedData.map((mod) => {
          const IconComponent = MODULE_ICONS[mod.id] || HelpCircle;
          const isActive = activeTab === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              className={`perm-tab-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => setActiveTab(mod.id)}
            >
              <IconComponent size={14} />
              {mod.name.split('&')[0].trim()}
              <span className="perm-tab-badge">
                {mod.enabledCount}/{mod.totalCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── 5. Modal Scrollable Body & Permissions Grid ─── */}
      <div className="perm-modal-body">
        {error && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
            <AlertCircle size={18} />
            <div>{error}</div>
          </Alert>
        )}
        {successMsg && (
          <Alert variant="success" className="d-flex align-items-center gap-2 mb-3">
            <CheckCircle2 size={18} />
            <div>{successMsg}</div>
          </Alert>
        )}

        {loading ? (
          <div className="text-center p-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted fw-semibold">Đang tải cấu hình quyền...</p>
          </div>
        ) : displayedModules.length === 0 ? (
          <div className="perm-empty-state">
            <div className="perm-empty-icon">🔍</div>
            <h6 className="fw-bold">Không tìm thấy quyền phù hợp</h6>
            <p className="small text-muted mb-3">
              Không có quyền nào khớp với từ khóa "{searchQuery}".
            </p>
            <button
              type="button"
              className="perm-quick-btn is-primary"
              onClick={() => setSearchQuery('')}
            >
              Xóa từ khóa tìm kiếm
            </button>
          </div>
        ) : (
          displayedModules.map((mod) => {
            const IconComponent = MODULE_ICONS[mod.id] || HelpCircle;
            const isAllEnabledInMod = mod.enabledCount === mod.totalCount && mod.totalCount > 0;

            return (
              <div key={mod.id} className="perm-module-section">
                <div className="perm-module-header">
                  <h6 className="perm-module-title">
                    <IconComponent size={16} className="text-primary" />
                    {mod.name} ({mod.enabledCount}/{mod.totalCount})
                  </h6>
                  <div className="d-flex gap-1">
                    <button
                      type="button"
                      className="perm-quick-btn"
                      onClick={() => handleToggleModule(mod.id, !isAllEnabledInMod)}
                      title={isAllEnabledInMod ? 'Tắt toàn bộ nhóm này' : 'Bật toàn bộ nhóm này'}
                    >
                      {isAllEnabledInMod ? 'Tắt nhóm này' : 'Bật nhóm này'}
                    </button>
                  </div>
                </div>

                <div className="perm-grid">
                  {mod.perms.map((perm) => {
                    const isChecked = selectedPermissions.has(perm.code);
                    return (
                      <div
                        key={perm.code}
                        className={`perm-card ${isChecked ? 'is-active' : ''}`}
                        onClick={() => handleTogglePermission(perm.code)}
                      >
                        <div className="perm-card-content">
                          <div className="perm-card-top">
                            <span className="perm-card-title" title={perm.title}>
                              {perm.title}
                            </span>
                            {perm.badge && (
                              <span className="perm-tag">{perm.badge}</span>
                            )}
                          </div>
                          <p className="perm-card-desc" title={perm.description}>
                            {perm.description}
                          </p>
                        </div>

                        {/* iOS-Style Toggle Switch */}
                        <label
                          className="perm-toggle-switch"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="perm-toggle-input"
                            checked={isChecked}
                            onChange={() => handleTogglePermission(perm.code)}
                          />
                          <span className="perm-toggle-slider" />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── 6. Modal Footer ─── */}
      <div className="perm-modal-footer">
        <div className="perm-footer-hint">
          <HelpCircle size={14} />
          <span>Nhân viên chỉ thấy các chức năng được cấp quyền khi đăng nhập.</span>
        </div>

        <div className="perm-footer-actions">
          <button
            type="button"
            className="perm-btn-cancel"
            onClick={onHide}
            disabled={saving}
          >
            Hủy
          </button>
          <button
            type="button"
            className="perm-btn-save"
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? (
              <>
                <Spinner animation="border" size="sm" />
                Đang lưu...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Lưu cấu hình quyền
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

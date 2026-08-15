import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProductEditForm from '../components/ProductEditForm';
import { productsApi } from '../api';
import { getMockProductById } from '../api/productMockData';
import { categoriesApi } from '../../category/api';
import { EDIT_PRODUCT_FORM_ID, PRODUCT_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/AddProduct.css';
import '../../../css/EditProduct.css';

const MOCK_CATEGORIES = [
  { id: 1, name: 'Gia vị & Chế biến' },
  { id: 2, name: 'Đồ uống' },
  { id: 3, name: 'Thực phẩm khô' },
  { id: 4, name: 'Sữa & em bé' },
  { id: 5, name: 'Hóa mỹ phẩm' },
  { id: 6, name: 'Bánh kẹo' },
];

function mapDetailToForm(detail) {
  if (!detail) return null;
  // Already form-shaped from mock
  if (detail.conversionUnits || detail.baseUnit) {
    return {
      ...detail,
      categoryId: detail.categoryId != null ? String(detail.categoryId) : '',
      costPrice: String(detail.costPrice ?? 0),
      sellingPrice: String(detail.sellingPrice ?? 0),
      baseSellPrice: String(detail.baseSellPrice ?? detail.sellingPrice ?? 0),
      images: (detail.images || []).map((img) => ({
        ...img,
        preview: img.preview || img.url,
      })),
    };
  }

  const units = detail.units || [];
  const isBaseUnit = (u) =>
    u.isBase === true || u.base === true || Number(u.unitBase) === 1;
  const base = units.find(isBaseUnit) || units[0];
  const conversions = units
    .filter((u) => !isBaseUnit(u))
    .map((u) => ({
      id: String(u.id),
      unitName: u.name,
      qty: String(u.unitBase ?? 1),
      ofUnit: base?.name || 'Chai',
      sellPrice: String(u.sellingPrice ?? 0),
    }));

  return {
    id: detail.id,
    name: detail.name || '',
    sku: detail.sku || '',
    barcode: detail.barcode || '',
    categoryId: detail.categoryId != null ? String(detail.categoryId) : '',
    brand: detail.brand || '',
    description: detail.description || '',
    status: detail.status || 'active',
    baseUnit: detail.baseUnitName || base?.name || 'Chai',
    baseSellPrice: String(detail.sellingPrice ?? base?.sellingPrice ?? 0),
    costPrice: String(detail.costPrice ?? 0),
    sellingPrice: String(detail.sellingPrice ?? 0),
    vatPercent: detail.vatPercent != null ? Number(detail.vatPercent) : 10,
    conversionUnits: conversions,
    images: (detail.images || []).map((img) => ({
      id: img.id,
      preview: img.url,
      url: img.url,
      publicId: img.publicId,
      isMain: img.isMain,
    })),
  };
}

function toUpsertPayload(formData) {
  const baseUnit = formData.baseUnit || 'Chai';
  const abs = { [baseUnit]: 1 };
  for (const u of formData.conversionUnits || []) {
    if (!u.unitName?.trim()) continue;
    const ref = u.ofUnit || baseUnit;
    const refAbs = abs[ref] || 1;
    abs[u.unitName] = (Number(u.qty) || 1) * refAbs;
  }

  const units = [
    {
      name: baseUnit,
      unitBase: 1,
      sellingPrice: formData.sellingPrice,
      isBase: true,
    },
    ...(formData.conversionUnits || [])
      .filter((u) => u.unitName?.trim())
      .map((u) => ({
        name: u.unitName,
        unitBase: abs[u.unitName] || Number(u.qty) || 1,
        sellingPrice: Number(u.sellPrice) || 0,
        isBase: false,
      })),
  ];

  return {
    name: formData.name,
    sku: formData.sku || null,
    barcode: formData.barcode || null,
    categoryId: Number(formData.categoryId),
    brand: formData.brand || null,
    description: formData.description || null,
    status: formData.status || 'active',
    costPrice: formData.costPrice,
    sellingPrice: formData.sellingPrice,
    vatPercent: formData.vatPercent ?? 10,
    units,
    attributes: [],
  };
}

export default function ProductEditPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const [detail, cats] = await Promise.all([
          productsApi.getById(productId),
          categoriesApi.getAllCategories().catch(() => []),
        ]);
        if (cancelled) return;
        const mapped = mapDetailToForm(detail);
        if (!mapped) {
          throw new Error('empty');
        }
        setCategories(Array.isArray(cats) && cats.length ? cats : MOCK_CATEGORIES);
        setProduct(mapped);
        setUsingMock(false);
      } catch {
        if (cancelled) return;
        const mock = getMockProductById(productId);
        if (mock) {
          setProduct(mapDetailToForm(mock));
          setCategories(MOCK_CATEGORIES);
          setUsingMock(true);
          setNotFound(false);
        } else {
          setProduct(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleCancel = () => {
    navigate(PRODUCT_ROUTES.list);
  };

  const handleSubmit = async (formData) => {
    if (usingMock) {
      navigate(PRODUCT_ROUTES.list);
      return;
    }
    await productsApi.update(productId, toUpsertPayload(formData));
    navigate(PRODUCT_ROUTES.list);
  };

  const handleUploadImage = async (file) => {
    if (usingMock) {
      const preview = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return {
        id: `local-${Date.now()}`,
        preview,
        url: preview,
        isMain: false,
      };
    }
    const img = await productsApi.uploadImage(productId, file);
    return {
      id: img.id,
      preview: img.url,
      url: img.url,
      publicId: img.publicId,
      isMain: img.isMain,
    };
  };

  const handleRemoveImage = async (imageId) => {
    if (usingMock) return;
    await productsApi.deleteImage(productId, imageId);
  };

  if (loading) {
    return (
      <div className="admin-content">
        <AdminHeader />
        <main className="admin-main">
          <div className="dashboard-container add-product-page">
            <p className="edit-product-not-found">Đang tải sản phẩm…</p>
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="admin-content">
        <AdminHeader />
        <main className="admin-main">
          <div className="dashboard-container add-product-page">
            <p className="edit-product-not-found">Không tìm thấy sản phẩm.</p>
            <Link to={PRODUCT_ROUTES.list} className="add-product-link-btn">
              Quay lại danh sách sản phẩm
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <AdminHeader />
      <main className="admin-main">
        <div className="dashboard-container add-product-page edit-product-page">
          <nav className="add-product-breadcrumb" aria-label="Breadcrumb">
            <span className="add-product-breadcrumb__muted">Sản phẩm</span>
            <span className="add-product-breadcrumb__sep">&gt;</span>
            <Link to={PRODUCT_ROUTES.list} className="add-product-breadcrumb__link">
              Danh sách sản phẩm
            </Link>
            <span className="add-product-breadcrumb__sep">&gt;</span>
            <span className="add-product-breadcrumb__current">Chỉnh sửa sản phẩm</span>
          </nav>

          <ProductEditForm
            formId={EDIT_PRODUCT_FORM_ID}
            initialData={product}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onUploadImage={handleUploadImage}
            onRemoveImage={handleRemoveImage}
          />
        </div>
      </main>
    </div>
  );
}

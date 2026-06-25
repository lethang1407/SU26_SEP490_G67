import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProductEditForm from '../components/ProductEditForm';
import { buildUpdatePayload, getProductById, mapProductEditView, updateProduct, uploadProductImage } from '../api';
import { EDIT_PRODUCT_FORM_ID, PRODUCT_ROUTES } from '../constants';
import { getApiErrorMessage } from '../../../utils/api-utils';
import '../../../css/AdminDashboard.css';
import '../../../css/Product.css';

export default function EditProductPage() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [submitError, setSubmitError] = useState(null);

    useEffect(() => {
        let isCancelled = false;

        const fetchProduct = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await getProductById(productId);
                if (!isCancelled) {
                    setProduct(mapProductEditView(data));
                }
            } catch (fetchError) {
                if (!isCancelled) {
                    setProduct(null);
                    setError(getApiErrorMessage(fetchError, 'Không tìm thấy sản phẩm.'));
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchProduct();

        return () => {
            isCancelled = true;
        };
    }, [productId]);

    const handleBack = () => {
        navigate(PRODUCT_ROUTES.detail(productId));
    };

    const handleSubmit = async (formData) => {
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            let productImg = formData.productImg;
            if (formData.imageFile) {
                productImg = await uploadProductImage(formData.imageFile);
            } else if (productImg === null) {
                productImg = '';
            }

            await updateProduct(productId, {
                ...buildUpdatePayload(formData),
                productImg,
            });
            navigate(PRODUCT_ROUTES.detail(productId));
        } catch (updateError) {
            setSubmitError(
                getApiErrorMessage(updateError, 'Không thể cập nhật sản phẩm. Vui lòng thử lại.'),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="admin-layout">
                <SideBar />
                <div className="admin-content">
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container product-page text-center p-5">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Đang tải...</span>
                            </Spinner>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="admin-layout">
                <SideBar />
                <div className="admin-content">
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container product-page">
                            <div className="product-table-card product-table-card--empty">
                                <p>{error ?? 'Không tìm thấy sản phẩm.'}</p>
                                <Link to={PRODUCT_ROUTES.list} className="product-detail-back-link">
                                    Quay lại danh sách
                                </Link>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container product-page product-edit-page">
                        <nav className="product-breadcrumb" aria-label="Breadcrumb">
                            <Link to={PRODUCT_ROUTES.list} className="product-breadcrumb__link">
                                Sản phẩm
                            </Link>
                            <span className="product-breadcrumb__sep">&gt;</span>
                            <Link to={PRODUCT_ROUTES.list} className="product-breadcrumb__link">
                                Danh sách sản phẩm
                            </Link>
                            <span className="product-breadcrumb__sep">&gt;</span>
                            <span className="product-breadcrumb__current">Chỉnh sửa sản phẩm</span>
                        </nav>

                        <div className="product-create-page-header">
                            <h1 className="product-create-page-header__title">
                                Chỉnh sửa sản phẩm: {product.name}
                            </h1>
                            <div className="product-create-page-header__actions">
                                <button
                                    type="button"
                                    className="product-btn product-btn--secondary"
                                    onClick={handleBack}
                                    disabled={isSubmitting}
                                >
                                    Quay lại
                                </button>
                                <button
                                    type="submit"
                                    form={EDIT_PRODUCT_FORM_ID}
                                    className="product-btn product-btn--primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </div>

                        {submitError && (
                            <Alert variant="danger" onClose={() => setSubmitError(null)} dismissible>
                                {submitError}
                            </Alert>
                        )}

                        <ProductEditForm
                            key={productId}
                            formId={EDIT_PRODUCT_FORM_ID}
                            product={product}
                            isSubmitting={isSubmitting}
                            onSubmit={handleSubmit}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}

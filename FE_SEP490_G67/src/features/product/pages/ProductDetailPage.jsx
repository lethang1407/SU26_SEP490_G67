import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProductDetailHeader from '../components/ProductDetailHeader';
import ProductBasicInfoCard from '../components/ProductBasicInfoCard';
import ProductPricingCard, { ProductInventoryCard } from '../components/ProductPricingCard';
import ProductDetailNav from '../components/ProductDetailNav';
import { getProductById, mapProductDetailView } from '../api';
import { PRODUCT_ROUTES } from '../constants';
import { getApiErrorMessage } from '../../../utils/api-utils';
import '../../../css/AdminDashboard.css';
import '../../../css/Product.css';

export default function ProductDetailPage() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('detail');
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isCancelled = false;

        const fetchProduct = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await getProductById(productId);
                if (!isCancelled) {
                    setProduct(mapProductDetailView(data));
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
        navigate(PRODUCT_ROUTES.list);
    };

    const handleDelete = () => {
        // TODO: gọi API xóa sản phẩm khi backend hỗ trợ
        console.log('Delete product:', productId);
    };

    const handleEdit = () => {
        navigate(PRODUCT_ROUTES.edit(productId));
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
                    <div className="dashboard-container product-page product-detail-page">
                        <ProductDetailHeader
                            product={product}
                            onBack={handleBack}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                        />

                        <div className="product-detail-layout">
                            <div className="product-detail-layout__main">
                                <ProductBasicInfoCard product={product} />
                            </div>
                            <div className="product-detail-layout__side">
                                <ProductPricingCard product={product} />
                                <ProductInventoryCard product={product} />
                            </div>
                        </div>

                        <ProductDetailNav
                            activeSection={activeSection}
                            onSectionChange={setActiveSection}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProductDetailHeader from '../components/ProductDetailHeader';
import ProductBasicInfoCard from '../components/ProductBasicInfoCard';
import ProductPricingCard, { ProductInventoryCard } from '../components/ProductPricingCard';
import ProductDetailNav from '../components/ProductDetailNav';
import { MOCK_PRODUCTS } from '../api/productMockData';
import { getProductDetailById } from '../api/mockProductDetails';
import { PRODUCT_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/Product.css';

export default function ProductDetailPage() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('detail');

    const product = useMemo(
        () => getProductDetailById(productId, MOCK_PRODUCTS),
        [productId],
    );

    const handleBack = () => {
        navigate(PRODUCT_ROUTES.list);
    };

    const handleDelete = () => {
        // TODO: gọi API xóa sản phẩm
        console.log('Delete product:', productId);
    };

    const handleEdit = () => {
        navigate(PRODUCT_ROUTES.edit(productId));
    };

    if (!product) {
        return (
            <div className="admin-layout">
                <SideBar />
                <div className="admin-content">
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container product-page">
                            <div className="product-table-card product-table-card--empty">
                                <p>Không tìm thấy sản phẩm.</p>
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

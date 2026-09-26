import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    BookOpenCheck,
    ChevronRight,
    CircleHelp,
    Clock3,
    LayoutDashboard,
    LockKeyhole,
    Mail,
    MessageCircle,
    MonitorSmartphone,
    Phone,
    ReceiptText,
    ShieldCheck,
    ShoppingCart,
    WifiOff,
} from 'lucide-react';
import { AuthContext } from '../../../app/providers/AuthProvider';
import { getDefaultLandingPath } from '../../../app/config/routePermissions';
import '../../../css/SupportPage.css';

const QUICK_GUIDES = [
    {
        icon: ShoppingCart,
        title: 'Bán hàng tại quầy',
        description: 'Tạo đơn, chọn khách hàng, áp dụng thanh toán và in hóa đơn.',
        accent: 'blue',
    },
    {
        icon: ReceiptText,
        title: 'Đơn hàng và công nợ',
        description: 'Tra cứu hóa đơn, ghi nhận thanh toán và theo dõi khoản nợ.',
        accent: 'violet',
    },
    {
        icon: WifiOff,
        title: 'Làm việc khi mất mạng',
        description: 'Kiểm tra trạng thái ngoại tuyến và đồng bộ lại khi có kết nối.',
        accent: 'amber',
    },
    {
        icon: LockKeyhole,
        title: 'Tài khoản và phân quyền',
        description: 'Đổi mật khẩu hoặc liên hệ quản lý khi thiếu quyền thao tác.',
        accent: 'green',
    },
];

const FAQS = [
    {
        question: 'Tôi không đăng nhập được thì phải làm gì?',
        answer: 'Kiểm tra lại số điện thoại và mật khẩu. Nếu quên mật khẩu, chọn “Quên mật khẩu” tại màn hình đăng nhập để xác thực và đặt lại.',
    },
    {
        question: 'Dữ liệu chưa cập nhật sau khi có mạng trở lại?',
        answer: 'Giữ ứng dụng mở và chờ quá trình đồng bộ hoàn tất. Nếu dữ liệu vẫn chưa xuất hiện, tải lại trang rồi cung cấp mã đơn hàng cho bộ phận hỗ trợ.',
    },
    {
        question: 'Vì sao tôi không thấy một chức năng?',
        answer: 'Các chức năng được hiển thị theo vai trò và quyền được cấp. Nhân viên cần liên hệ quản lý cửa hàng để kiểm tra hoặc bổ sung quyền.',
    },
];

export default function SupportPage() {
    const navigate = useNavigate();
    const { authenticated, loadingUser, user, hasPermission, hasRole } = useContext(AuthContext);

    const isManager = hasRole('MANAGER') || hasRole('ADMIN');
    const isStaff = hasRole('STAFF');
    const destination = authenticated
        ? getDefaultLandingPath(hasRole, hasPermission, user)
        : '/login';

    const destinationLabel = !authenticated
        ? 'Về trang đăng nhập'
        : isManager
            ? 'Về trang tổng quan'
            : isStaff
                ? 'Về màn hình bán hàng'
                : 'Về trang làm việc';

    const DestinationIcon = isManager ? LayoutDashboard : MonitorSmartphone;

    const handleGoBack = () => {
        navigate(destination, { replace: true });
    };

    return (
        <div className="support-page">
            <header className="support-page__topbar">
                <button
                    type="button"
                    className="support-page__brand"
                    onClick={handleGoBack}
                    disabled={loadingUser}
                    aria-label={destinationLabel}
                >
                    <span className="support-page__brand-mark">ĐT</span>
                    <span>
                        <strong>Đức Thắng</strong>
                        <small>Trung tâm hỗ trợ</small>
                    </span>
                </button>

                <button
                    type="button"
                    className="support-page__return-button"
                    onClick={handleGoBack}
                    disabled={loadingUser}
                >
                    <ArrowLeft size={18} />
                    <span>{loadingUser && authenticated ? 'Đang tải...' : destinationLabel}</span>
                </button>
            </header>

            <main>
                <section className="support-page__hero">
                    <div className="support-page__hero-glow support-page__hero-glow--one" />
                    <div className="support-page__hero-glow support-page__hero-glow--two" />
                    <div className="support-page__hero-content">
                        <div className="support-page__eyebrow">
                            <CircleHelp size={17} /> Hỗ trợ sử dụng hệ thống
                        </div>
                        <h1>Bạn cần hỗ trợ vấn đề gì?</h1>
                        <p>
                            Xem hướng dẫn xử lý nhanh hoặc liên hệ với bộ phận kỹ thuật.
                            Khi báo lỗi, hãy gửi kèm ảnh màn hình và mã đơn liên quan để được hỗ trợ nhanh hơn.
                        </p>
                        <button
                            type="button"
                            className="support-page__primary-action"
                            onClick={handleGoBack}
                            disabled={loadingUser}
                        >
                            <DestinationIcon size={19} />
                            {loadingUser && authenticated ? 'Đang xác định trang làm việc...' : destinationLabel}
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className="support-page__hero-card" aria-hidden="true">
                        <div className="support-page__hero-icon">
                            <BookOpenCheck size={34} />
                        </div>
                        <strong>Hướng dẫn nhanh</strong>
                        <span>Các bước xử lý cho những tình huống thường gặp</span>
                        <div className="support-page__status">
                            <span /> Hệ thống hỗ trợ đang hoạt động
                        </div>
                    </div>
                </section>

                <div className="support-page__content">
                    <section className="support-page__section" aria-labelledby="quick-guide-title">
                        <div className="support-page__section-heading">
                            <div>
                                <span className="support-page__section-kicker">TỰ XỬ LÝ NHANH</span>
                                <h2 id="quick-guide-title">Chủ đề thường gặp</h2>
                            </div>
                            <p>Chọn nhóm vấn đề gần nhất với tình huống của bạn.</p>
                        </div>

                        <div className="support-page__guide-grid">
                            {QUICK_GUIDES.map(({ icon: Icon, title, description, accent }) => (
                                <article className="support-page__guide-card" key={title}>
                                    <div className={`support-page__guide-icon support-page__guide-icon--${accent}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <h3>{title}</h3>
                                        <p>{description}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <div className="support-page__two-column">
                        <section className="support-page__section support-page__panel" aria-labelledby="faq-title">
                            <div className="support-page__section-heading support-page__section-heading--compact">
                                <div>
                                    <span className="support-page__section-kicker">CÂU HỎI THƯỜNG GẶP</span>
                                    <h2 id="faq-title">Có thể bạn đang cần</h2>
                                </div>
                            </div>

                            <div className="support-page__faq-list">
                                {FAQS.map((item, index) => (
                                    <details key={item.question} open={index === 0}>
                                        <summary>
                                            {item.question}
                                            <ChevronRight size={18} />
                                        </summary>
                                        <p>{item.answer}</p>
                                    </details>
                                ))}
                            </div>
                        </section>

                        <aside className="support-page__contact-panel" aria-labelledby="contact-title">
                            <div className="support-page__contact-heading">
                                <div className="support-page__contact-heading-icon">
                                    <ShieldCheck size={25} />
                                </div>
                                <div>
                                    <span>Cần thêm trợ giúp?</span>
                                    <h2 id="contact-title">Liên hệ hỗ trợ kỹ thuật</h2>
                                </div>
                            </div>

                            <div className="support-page__contact-list">
                                <a href="mailto:support@example.com" className="support-page__contact-item">
                                    <span className="support-page__contact-icon"><Mail size={20} /></span>
                                    <span><small>Email hỗ trợ</small><strong>support@example.com</strong></span>
                                    <ChevronRight size={18} />
                                </a>
                                <a href="tel:19001234" className="support-page__contact-item">
                                    <span className="support-page__contact-icon"><Phone size={20} /></span>
                                    <span><small>Hotline</small><strong>1900 1234</strong></span>
                                    <ChevronRight size={18} />
                                </a>
                                <div className="support-page__contact-item">
                                    <span className="support-page__contact-icon"><MessageCircle size={20} /></span>
                                    <span><small>Zalo hỗ trợ</small><strong>0987 654 321</strong></span>
                                </div>
                            </div>

                            <div className="support-page__availability">
                                <Clock3 size={18} />
                                <span><strong>Thời gian hỗ trợ</strong>08:00 – 17:30, Thứ Hai đến Thứ Bảy</span>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>

            <footer className="support-page__footer">
                <span>Hệ thống quản lý cửa hàng Đức Thắng</span>
                <span>Vui lòng không chia sẻ mật khẩu hoặc mã xác thực cho người khác.</span>
            </footer>
        </div>
    );
}

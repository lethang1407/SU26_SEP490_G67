const SECTIONS = [
    { id: 'detail', label: 'Thông tin chi tiết' },
    { id: 'import', label: 'Lịch sử nhập hàng' },
    { id: 'sales', label: 'Lịch sử bán hàng' },
];

const SECTION_CONTENT = {
    detail: 'Nội dung thông tin chi tiết sẽ được cập nhật khi có API.',
    import: 'Lịch sử nhập hàng sẽ được hiển thị tại đây.',
    sales: 'Lịch sử bán hàng sẽ được hiển thị tại đây.',
};

export default function ProductDetailNav({ activeSection, onSectionChange }) {
    return (
        <section className="product-detail-section">
            <div className="product-detail-section__actions">
                {SECTIONS.map((section) => (
                    <button
                        key={section.id}
                        type="button"
                        className={`product-detail-section__btn${
                            activeSection === section.id ? ' product-detail-section__btn--active' : ''
                        }`}
                        onClick={() => onSectionChange(section.id)}
                    >
                        {section.label}
                    </button>
                ))}
            </div>

            <div className="product-detail-section__content">
                <p className="product-detail-section__placeholder">
                    {SECTION_CONTENT[activeSection]}
                </p>
            </div>
        </section>
    );
}

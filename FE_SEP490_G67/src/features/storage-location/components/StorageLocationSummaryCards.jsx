export default function StorageLocationSummaryCards({ summary, onFilterStatus }) {
    const cards = [
        {
            id: 'total',
            label: 'Tổng vị trí',
            value: summary.totalLocations,
            suffix: 'ô kệ',
        },
        {
            id: 'occupied',
            label: 'Đang có hàng',
            value: summary.occupiedCount,
            suffix: 'ô',
            filter: 'occupied',
        },
        {
            id: 'empty',
            label: 'Ô trống',
            value: summary.emptyCount,
            suffix: 'ô',
            filter: 'empty',
        },
        {
            id: 'near-expiry',
            label: 'Có hàng sắp HSD',
            value: summary.nearExpiryCount,
            suffix: 'ô',
            valueClass: summary.nearExpiryCount > 0 ? 'inventory-stat-card__value--warning' : '',
            filter: 'near_expiry',
        },
    ];

    return (
        <div className="inventory-stat-cards">
            {cards.map((card) => {
                const isClickable = Boolean(card.filter && onFilterStatus);

                return (
                    <button
                        key={card.id}
                        type="button"
                        className={`inventory-stat-card storage-location-stat-card${isClickable ? ' storage-location-stat-card--clickable' : ''}`}
                        onClick={isClickable ? () => onFilterStatus(card.filter) : undefined}
                        disabled={!isClickable}
                    >
                        <div className="inventory-stat-card__content">
                            <span className="inventory-stat-card__label">{card.label}</span>
                            <div className="inventory-stat-card__value-row">
                                <span className={`inventory-stat-card__value ${card.valueClass || ''}`}>
                                    {card.value}
                                </span>
                                {card.suffix && (
                                    <span className="inventory-stat-card__suffix">{card.suffix}</span>
                                )}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

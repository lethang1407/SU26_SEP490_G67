import { Package, Tags, Scale } from 'lucide-react';

const TABS = [
  {
    key: 'products',
    label: 'Hàng hóa',
    icon: Package,
  },
  {
    key: 'categories',
    label: 'Nhóm hàng hóa',
    icon: Tags,
  },
  {
    key: 'units',
    label: 'Đơn vị tính',
    icon: Scale,
  },
];

export default function ProductTabNav({ activeTab = 'products', onTabChange }) {
  return (
    <div className="prod-tab-nav-wrapper">
      <nav className="prod-tab-nav" aria-label="Product navigation tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`prod-tab-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange?.(tab.key)}
            >
              <Icon size={16} className="prod-tab-icon" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}


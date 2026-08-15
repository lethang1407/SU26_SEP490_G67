export const MOCK_CATEGORIES = [
  {
    id: 1,
    name: 'Gia vị',
    description: 'Nước mắm, hạt nêm, tương ớt, muối và gia vị nấu ăn',
    productCount: 12480,
    updatedAt: '2026-07-12T10:00:00Z',
  },
  {
    id: 2,
    name: 'Đồ uống',
    description: 'Nước ngọt, nước suối, trà, cà phê hòa tan',
    productCount: 38150,
    updatedAt: '2026-07-10T10:00:00Z',
  },
  {
    id: 3,
    name: 'Thực phẩm khô',
    description: 'Gạo, mì gói, bún, bánh phở, đồ khô đóng gói',
    productCount: 21960,
    updatedAt: '2026-07-08T10:00:00Z',
  },
  {
    id: 4,
    name: 'Sữa & em bé',
    description: 'Sữa tươi, sữa bột, tã, đồ dùng cho bé',
    productCount: 17204,
    updatedAt: '2026-07-05T10:00:00Z',
  },
  {
    id: 5,
    name: 'Hóa mỹ phẩm',
    description: 'Nước rửa chén, bột giặt, dầu gội, kem đánh răng',
    productCount: 29877,
    updatedAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 6,
    name: 'Bánh kẹo',
    description: 'Bánh quy, kẹo, snack đóng gói',
    productCount: 31026,
    updatedAt: '2026-06-28T10:00:00Z',
  },
];

export function filterAndSortCategories(rows, { keyword, sort }) {
  let result = [...rows];
  const kw = keyword?.trim().toLowerCase();
  if (kw) {
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(kw) ||
        (c.description || '').toLowerCase().includes(kw),
    );
  }

  if (sort === 'name-desc') {
    result.sort((a, b) => b.name.localeCompare(a.name, 'vi'));
  } else if (sort === 'count-desc') {
    result.sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
  } else {
    result.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }
  return result;
}

export function formatUpdatedAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatProductCount(n) {
  return Number(n || 0).toLocaleString('vi-VN');
}

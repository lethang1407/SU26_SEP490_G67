export const CATEGORY_ROUTES = {
  list: '/admin/products/categories',
};

export const CATEGORY_PAGE_SIZE = 10;

export const CATEGORY_SORT = {
  NAME_ASC: 'name-asc',
  NAME_DESC: 'name-desc',
  COUNT_DESC: 'count-desc',
};

export const CATEGORY_SORT_OPTIONS = [
  { value: CATEGORY_SORT.NAME_ASC, label: 'Tên A–Z' },
  { value: CATEGORY_SORT.NAME_DESC, label: 'Tên Z–A' },
  { value: CATEGORY_SORT.COUNT_DESC, label: 'Nhiều SP nhất' },
];

export const TABLE_PAGE_SIZE = 5;

export function paginateItems<T>(items: T[], requestedPage: number, pageSize = TABLE_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (page - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages,
    startItem: items.length === 0 ? 0 : startIndex + 1,
    endItem: Math.min(startIndex + pageSize, items.length),
  };
}

import rawCatalog from "./iconCatalog.json";

export interface IconCatalogCategory {
  id: string;
  label: string;
  count: number;
}

export interface IconCatalogItem {
  id: string;
  name: string;
  categoryId: string;
  sub: string | null;
  url: string;
}

interface RawIconCatalog {
  total: number;
  categories: IconCatalogCategory[];
  items: IconCatalogItem[];
}

const catalog = rawCatalog as RawIconCatalog;

export const ICON_CATALOG_TOTAL = catalog.total;
export const ICON_CATEGORIES: IconCatalogCategory[] = catalog.categories;
export const ICON_ITEMS: IconCatalogItem[] = catalog.items;

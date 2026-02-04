// API Types

export interface HistoryFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
  isPromo?: boolean;
  barcode?: string;
  page?: number;
  limit?: number;
}

export interface ProductFilters {
  search?: string;
  barcode?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  hasPromo?: boolean;
  page?: number;
  limit?: number;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface ParsedData {
  price?: number;
  originalPrice?: number;
  currency?: string;
  currencySymbol?: string;
  barcode?: string;
  isPromo?: boolean;
  promoType?: string;
  discountPercent?: number;
  productName?: string;
}

export interface ScanResult {
  id: string;
  text: string;
  timestamp: Date;
  imageUrl?: string;
  parsed?: ParsedData;
}

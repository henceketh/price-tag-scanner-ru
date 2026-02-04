import type { HistoryFilters, ProductFilters } from './types';

const API_URL = 'http://localhost:3001/api';

// Re-export types for convenience
export type { HistoryFilters, ProductFilters };

// Получить токен из localStorage
const getToken = () => localStorage.getItem('token');

// Базовый fetch с авторизацией
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
    throw new Error(error.error || 'Ошибка запроса');
  }

  return response.json();
};

// Auth API
export const authApi = {
  register: (username: string, email: string, password: string) =>
    fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  login: (login: string, password: string) =>
    fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }),

  me: () => fetchWithAuth('/auth/me'),

  logout: () => fetchWithAuth('/auth/logout', { method: 'POST' }),
};

// Scan API
export const scanApi = {
  scan: async (imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/scan`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
      throw new Error(error.error || 'Ошибка сканирования');
    }

    return response.json();
  },
};

// History API
export const historyApi = {
  getHistory: (filters: HistoryFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    return fetchWithAuth(`/history?${params.toString()}`);
  },

  getScan: (id: string) => fetchWithAuth(`/history/${id}`),

  deleteScan: (id: string) =>
    fetchWithAuth(`/history/${id}`, { method: 'DELETE' }),

  getStats: () => fetchWithAuth('/history/stats/summary'),
};

// Products API
export const productsApi = {
  getProducts: (filters: ProductFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    return fetchWithAuth(`/products?${params.toString()}`);
  },

  getProduct: (id: string) => fetchWithAuth(`/products/${id}`),

  getProductByBarcode: (barcode: string) =>
    fetchWithAuth(`/products/barcode/${barcode}`),

  getPriceHistory: (id: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchWithAuth(`/products/${id}/price-history?${params.toString()}`);
  },

  compareProducts: (productIds?: string[], barcodes?: string[]) =>
    fetchWithAuth('/products/compare', {
      method: 'POST',
      body: JSON.stringify({ productIds, barcodes }),
    }),
};

export default {
  auth: authApi,
  scan: scanApi,
  history: historyApi,
  products: productsApi,
};

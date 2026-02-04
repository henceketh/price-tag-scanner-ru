import { useState, useEffect, useCallback } from 'react';
import { historyApi, productsApi } from '../api';
import type { HistoryFilters } from '../types';
import { useToast } from './Toast';
import PriceChart from './PriceChart';

interface ScanItem {
  _id: string;
  originalText: string;
  imageData?: string;
  extractedData: {
    productName?: string;
    price?: number;
    originalPrice?: number;
    currency?: string;
    barcode?: string;
    isPromo?: boolean;
    promoType?: string;
    discountPercent?: number;
  };
  productId?: string;
  createdAt: string;
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScan?: (scan: ScanItem) => void;
}

export const HistoryPanel = ({ isOpen, onClose, onSelectScan }: HistoryPanelProps) => {
  const [items, setItems] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [priceHistory, setPriceHistory] = useState<any>(null);

  const { showToast, showConfirm } = useToast();

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { items, pagination: pag } = await historyApi.getHistory({
        ...filters,
        page: pagination.page,
        limit: 20,
      });
      setItems(items);
      setPagination(pag);
    } catch (error) {
      console.error('Failed to load history:', error);
      showToast('Не удалось загрузить историю', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, showToast]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  const loadPriceHistory = async (productId: string) => {
    try {
      const data = await productsApi.getPriceHistory(productId);
      setPriceHistory(data);
    } catch (error) {
      console.error('Failed to load price history:', error);
      showToast('Не удалось загрузить историю цен', 'error');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
    loadHistory();
  };

  const handleDelete = (id: string) => {
    showConfirm('Вы уверены, что хотите удалить эту запись?', async () => {
      try {
        await historyApi.deleteScan(id);
        setItems(items.filter(i => i._id !== id));
        showToast('Запись удалена', 'success', 2000);
      } catch (error) {
        console.error('Failed to delete:', error);
        showToast('Не удалось удалить запись', 'error');
      }
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return '—';
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽';
    return `${price.toFixed(2)} ${symbol}`;
  };

  if (!isOpen) return null;

  return (
    <div className="history-panel-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        <div className="history-panel-header">
          <h2 className="history-panel-title">История сканирований</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form className="history-filters" onSubmit={handleSearch}>
          <div className="filter-row">
            <input
              type="text"
              className="form-input"
              placeholder="Поиск..."
              value={filters.search || ''}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
            />
            <input
              type="text"
              className="form-input filter-barcode"
              placeholder="Штрих-код"
              value={filters.barcode || ''}
              onChange={e => setFilters({ ...filters, barcode: e.target.value })}
            />
          </div>
          <div className="filter-row">
            <input
              type="number"
              className="form-input filter-price"
              placeholder="Мин. цена"
              value={filters.minPrice || ''}
              onChange={e => setFilters({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })}
            />
            <input
              type="number"
              className="form-input filter-price"
              placeholder="Макс. цена"
              value={filters.maxPrice || ''}
              onChange={e => setFilters({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
            />
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={filters.isPromo || false}
                onChange={e => setFilters({ ...filters, isPromo: e.target.checked || undefined })}
              />
              <span>Только акции</span>
            </label>
            <button type="submit" className="btn btn-primary">
              Найти
            </button>
          </div>
        </form>

        <div className="history-content">
          {loading ? (
            <div className="history-loading">Загрузка...</div>
          ) : items.length === 0 ? (
            <div className="history-empty">История пуста</div>
          ) : (
            <div className="history-grid">
              {items.map(item => (
                <div
                  key={item._id}
                  className={`history-card ${item.extractedData.isPromo ? 'promo' : ''}`}
                >
                  {item.imageData && (
                    <div className="history-card-image">
                      <img src={item.imageData} alt="" />
                    </div>
                  )}
                  <div className="history-card-content">
                    <div className="history-card-header">
                      <span className="history-card-name">
                        {item.extractedData.productName || 'Без названия'}
                      </span>
                      {item.extractedData.isPromo && (
                        <span className="promo-badge">
                          {item.extractedData.promoType || 'Акция'}
                          {item.extractedData.discountPercent && ` -${item.extractedData.discountPercent}%`}
                        </span>
                      )}
                    </div>
                    <div className="history-card-price">
                      {item.extractedData.originalPrice && (
                        <span className="price-old">
                          {formatPrice(item.extractedData.originalPrice, item.extractedData.currency)}
                        </span>
                      )}
                      <span className={`price-current ${item.extractedData.isPromo ? 'price-promo' : ''}`}>
                        {formatPrice(item.extractedData.price, item.extractedData.currency)}
                      </span>
                    </div>
                    {item.extractedData.barcode && (
                      <div className="history-card-barcode">
                        {item.extractedData.barcode}
                      </div>
                    )}
                    <div className="history-card-date">
                      {formatDate(item.createdAt)}
                    </div>
                    <div className="history-card-actions">
                      {item.productId && (
                        <button
                          className="btn-small"
                          onClick={() => loadPriceHistory(item.productId!)}
                        >
                          График цен
                        </button>
                      )}
                      <button
                        className="btn-small"
                        onClick={() => onSelectScan?.(item)}
                      >
                        Показать
                      </button>
                      <button
                        className="btn-small btn-danger"
                        onClick={() => handleDelete(item._id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="history-pagination">
              <button
                className="btn btn-secondary"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              >
                Назад
              </button>
              <span className="pagination-info">
                Страница {pagination.page} из {pagination.pages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              >
                Вперёд
              </button>
            </div>
          )}
        </div>

        {priceHistory && (
          <div className="price-history-modal" onClick={() => setPriceHistory(null)}>
            <div className="price-history-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">История цен</h3>
                <button className="modal-close" onClick={() => setPriceHistory(null)}>
                  <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <PriceChart
                data={priceHistory.data}
                productName={priceHistory.productName}
                stats={priceHistory.stats}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface PricePoint {
  date: string;
  price: number;
  originalPrice?: number;
  isPromo?: boolean;
  store?: string;
}

interface PriceChartProps {
  data: PricePoint[];
  productName?: string;
  stats?: {
    min: number;
    max: number;
    avg: number;
  };
}

export const PriceChart = ({ data, productName, stats }: PriceChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="price-chart-empty">
        Нет данных для отображения графика
      </div>
    );
  }

  const chartData = data.map(point => ({
    ...point,
    date: new Date(point.date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    }),
    fullDate: new Date(point.date).toLocaleDateString('ru-RU'),
  }));

  const formatPrice = (value: number) => `${value.toFixed(0)} ₽`;

  return (
    <div className="price-chart">
      {productName && <h4 className="price-chart-title">{productName}</h4>}

      {stats && (
        <div className="price-chart-stats">
          <div className="stat-item">
            <span className="stat-label">Мин:</span>
            <span className="stat-value stat-min">{formatPrice(stats.min)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Средн:</span>
            <span className="stat-value">{formatPrice(stats.avg)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Макс:</span>
            <span className="stat-value stat-max">{formatPrice(stats.max)}</span>
          </div>
        </div>
      )}

      <div className="price-chart-container">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#666' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#666' }}
              tickLine={false}
              tickFormatter={formatPrice}
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #e5e5e5',
                borderRadius: 0,
                fontSize: 12,
              }}
              formatter={(value: number | undefined, name: string | undefined) => [
                value !== undefined ? formatPrice(value) : '—',
                name === 'price' ? 'Цена' : 'Старая цена'
              ]}
              labelFormatter={(label) => `Дата: ${label}`}
            />
            {stats && (
              <ReferenceLine
                y={stats.avg}
                stroke="#888"
                strokeDasharray="5 5"
                label={{ value: 'Средняя', fontSize: 10, fill: '#888' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#000"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.isPromo) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="#ef4444"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="#000"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }}
            />
            {data.some(d => d.originalPrice) && (
              <Line
                type="monotone"
                dataKey="originalPrice"
                stroke="#999"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="price-chart-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#000' }}></span>
          <span>Цена</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot legend-promo"></span>
          <span>Акция</span>
        </div>
      </div>
    </div>
  );
};

export default PriceChart;

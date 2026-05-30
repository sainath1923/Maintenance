import { useMemo, useState, useEffect } from 'react';
import { Row, Col, Select } from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie,
} from 'recharts';
import '../styles/dashboard.scss';

const PALETTE = ['#ea580c', '#f59e0b', '#2563eb', '#0ea5e9', '#10b981', '#84cc16', '#a855f7', '#ef4444'];
const formatCurrency = (v) => Number(v || 0).toFixed(2);

function extractYear(approvedAt) {
  if (!approvedAt) return 'Unknown';
  const d = new Date(approvedAt);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return String(d.getFullYear());
}

export default function Dashboard({ stockEntries, stockRequests }) {
  const [selectedYearFilter, setSelectedYearFilter] = useState('all');

  const approvedRequests = useMemo(
    () => stockRequests.filter((r) => r.status === 'Approved'),
    [stockRequests]
  );

  const availableYears = useMemo(() => {
    const years = new Set();
    approvedRequests.forEach((r) => {
      const y = extractYear(r.approvedAt);
      if (y !== 'Unknown') years.add(y);
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [approvedRequests]);

  useEffect(() => {
    if (selectedYearFilter !== 'all' && !availableYears.includes(selectedYearFilter)) {
      setSelectedYearFilter('all');
    }
  }, [selectedYearFilter, availableYears]);

  const filteredRequests = useMemo(() => {
    if (selectedYearFilter === 'all') return approvedRequests;
    return approvedRequests.filter((r) => extractYear(r.approvedAt) === selectedYearFilter);
  }, [approvedRequests, selectedYearFilter]);

  const priceByKey = useMemo(() => {
    const map = new Map();
    stockEntries.forEach((e) => map.set(`${e.category}::${e.item}`, Number(e.price || 0)));
    return map;
  }, [stockEntries]);

  const insights = useMemo(() => {
    const itemUsage = new Map();
    const categoryUsage = new Map();
    const itemExpense = new Map();
    const yearExpense = new Map();
    let totalExpense = 0;

    filteredRequests.forEach((r) => {
      const qty = Number(r.quantity || 0);
      if (!Number.isFinite(qty) || qty <= 0) return;
      const itemLabel = `${r.item || 'Unknown'} (${r.category || 'Uncategorized'})`;
      const catLabel = r.category || 'Uncategorized';
      const unitPrice = priceByKey.get(`${r.category || ''}::${r.item || ''}`) || 0;
      const cost = qty * unitPrice;
      itemUsage.set(itemLabel, (itemUsage.get(itemLabel) || 0) + qty);
      categoryUsage.set(catLabel, (categoryUsage.get(catLabel) || 0) + qty);
      itemExpense.set(itemLabel, (itemExpense.get(itemLabel) || 0) + cost);
      const year = extractYear(r.approvedAt);
      yearExpense.set(year, (yearExpense.get(year) || 0) + cost);
      totalExpense += cost;
    });

    const toRows = (map) =>
      Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const toYearRows = (map) =>
      Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => {
          const aY = Number(a.name), bY = Number(b.name);
          if (Number.isFinite(aY) && Number.isFinite(bY)) return aY - bY;
          if (Number.isFinite(aY)) return -1;
          if (Number.isFinite(bY)) return 1;
          return String(a.name).localeCompare(String(b.name));
        });

    return {
      totalExpense,
      approvedCount: filteredRequests.length,
      mostUsedItems: toRows(itemUsage).slice(0, 8),
      mostUsedCategories: toRows(categoryUsage),
      itemWiseExpense: toRows(itemExpense).slice(0, 8),
      yearWiseExpense: toYearRows(yearExpense),
    };
  }, [filteredRequests, priceByKey]);

  const yearOptions = [
    { label: 'All Years', value: 'all' },
    ...availableYears.map((y) => ({ label: y, value: y })),
  ];

  return (
    <div className="dashboard-wrap">
      <div className="dashboard-filter-row">
        <Select
          value={selectedYearFilter}
          onChange={setSelectedYearFilter}
          options={yearOptions}
          style={{ minWidth: 160 }}
        />
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12}>
          <div className="summary-card">
            <div className="summary-label">
              Total Maintenance Cost
              {selectedYearFilter !== 'all' ? ` (${selectedYearFilter})` : ''}
            </div>
            <div className="summary-value">{formatCurrency(insights.totalExpense)}</div>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div className="summary-card">
            <div className="summary-label">
              Approved Item Requests
              {selectedYearFilter !== 'all' ? ` (${selectedYearFilter})` : ''}
            </div>
            <div className="summary-value">{insights.approvedCount}</div>
          </div>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} md={12}>
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Most Used Items</div>
              <span className="chip">Item level</span>
            </div>
            {insights.mostUsedItems.length === 0 ? (
              <div className="chart-empty">No approved data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={insights.mostUsedItems} margin={{ top: 8, right: 12, left: 0, bottom: 48 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {insights.mostUsedItems.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Most Used Categories</div>
              <span className="chip">Category level</span>
            </div>
            {insights.mostUsedCategories.length === 0 ? (
              <div className="chart-empty">No approved data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={insights.mostUsedCategories}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {insights.mostUsedCategories.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, 'Qty']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Most Cost Expense Item Wise</div>
              <span className="chip">By item</span>
            </div>
            {insights.itemWiseExpense.length === 0 ? (
              <div className="chart-empty">No approved data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={insights.itemWiseExpense} layout="vertical" margin={{ top: 4, right: 60, left: 0, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [formatCurrency(v), 'Cost']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {insights.itemWiseExpense.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Year Wise Maintenance Cost</div>
              <span className="chip">By year</span>
            </div>
            {insights.yearWiseExpense.length === 0 ? (
              <div className="chart-empty">No approved data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={insights.yearWiseExpense} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [formatCurrency(v), 'Cost']} />
                  <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ r: 4, fill: '#ea580c' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
}

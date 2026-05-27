
import React, { useEffect, useMemo, useState } from 'react';
import { notification } from 'antd';
import 'antd/dist/reset.css';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : '');

function useCompanyLogo() {
  const [logo, setLogo] = useState('');
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/company-profile?cb=${Date.now()}`);
        const data = await res.json();
        if (res.ok && data.logoUrl) {
          const url = data.logoUrl;
          if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
            const sep = url.includes('?') ? '&' : '?';
            setLogo(`${url}${sep}cb=${Date.now()}`);
          } else {
            setLogo(url);
          }
        }
      } catch {}
    };
    const onFocus = () => loadLogo();
    const onVisibility = () => { if (document.visibilityState === 'visible') loadLogo(); };
    loadLogo();
    const timer = setInterval(loadLogo, 30000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return logo;
}

function useBuildingName() {
  const [building, setBuilding] = useState('');
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/company-profile`);
        const data = await res.json();
        if (res.ok) {
          setBuilding(data.buildingName || data.buildingAddress || data.name || '');
        }
      } catch {}
    };
    load();
  }, []);
  return building;
}

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('stores1@example.com');
  const [password, setPassword] = useState('Stores@123');
  const [error, setError] = useState('');
  const companyLogo = useCompanyLogo();
  const buildingName = useBuildingName();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Login failed');
        return;
      }
      if (data.role !== 'stores') {
        setError('This portal is only for stores users');
        return;
      }
      localStorage.setItem('stores_token', data.token);
      onLoggedIn();
    } catch {
      setError('Network error');
    }
  };
  return (
    <div className="app-shell">
      <div className="app-card">
        <div className="app-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {companyLogo && (
              <img
                src={companyLogo}
                alt="Company logo"
                style={{ height: '75px', objectFit: 'contain' }}
              />
            )}
            <div>
              <div className="app-title">Stores Console</div>
              <div className="app-subtitle">Manage stock and process technician requests</div>
            </div>
          </div>
          <div className="app-badge">Stores</div>
        </div>
        <div className="app-main">
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Sign in</div>
              <span className="chip">Stores</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-danger">{error}</p>}
              <button className="btn-primary" type="submit">
                Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


function StoresDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [stockItemsByCategory, setStockItemsByCategory] = useState({});
  const [stockEntries, setStockEntries] = useState([]);
  const [stockRequests, setStockRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [updatedOn, setUpdatedOn] = useState(new Date().toISOString().slice(0, 10));
  const [editingEntryId, setEditingEntryId] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState('all');
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [assigningRequestId, setAssigningRequestId] = useState(null);
  const [assigningPersonId, setAssigningPersonId] = useState('');
  const [assignError, setAssignError] = useState('');
  const companyLogo = useCompanyLogo();
  const buildingName = useBuildingName();
  const token = localStorage.getItem('stores_token');

  // Attendance state
  const [attendanceToday, setAttendanceToday] = useState({ punchIn: null, punchOut: null });
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [attendanceMsg, setAttendanceMsg] = useState('');

  const loadAttendanceToday = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceToday({ punchIn: data.punchIn, punchOut: data.punchOut });
      }
    } catch { /* ignore */ }
  };

  const doPunchIn = () => {
    setAttendanceBusy(true);
    setAttendanceError('');
    setAttendanceMsg('');
    if (!navigator.geolocation) {
      setAttendanceError('Geolocation is not supported by this browser.');
      setAttendanceBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`${API_BASE}/api/attendance/punch-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          });
          const data = await res.json();
          if (res.ok) {
            setAttendanceMsg('Punched in successfully!');
            await loadAttendanceToday();
          } else {
            setAttendanceError(data.message || 'Punch in failed.');
          }
        } catch {
          setAttendanceError('Network error.');
        } finally {
          setAttendanceBusy(false);
        }
      },
      () => {
        setAttendanceError('Could not get your location. Please allow location access.');
        setAttendanceBusy(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const doPunchOut = () => {
    setAttendanceBusy(true);
    setAttendanceError('');
    setAttendanceMsg('');
    if (!navigator.geolocation) {
      setAttendanceError('Geolocation is not supported by this browser.');
      setAttendanceBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`${API_BASE}/api/attendance/punch-out`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          });
          const data = await res.json();
          if (res.ok) {
            setAttendanceMsg('Punched out successfully!');
            await loadAttendanceToday();
          } else {
            setAttendanceError(data.message || 'Punch out failed.');
          }
        } catch {
          setAttendanceError('Network error.');
        } finally {
          setAttendanceBusy(false);
        }
      },
      () => {
        setAttendanceError('Could not get your location. Please allow location access.');
        setAttendanceBusy(false);
      },
      { enableHighAccuracy: true }
    );
  };
  const categoryOptions = useMemo(() => Object.keys(stockItemsByCategory), [stockItemsByCategory]);
  const itemOptions = selectedCategory ? stockItemsByCategory[selectedCategory] || [] : [];
  const formatCurrency = (value) => Number(value || 0).toFixed(2);
  const chartPalette = ['#ea580c', '#f59e0b', '#2563eb', '#0ea5e9', '#10b981', '#84cc16', '#a855f7', '#ef4444'];
  const approvedStockRequests = useMemo(
    () => stockRequests.filter((request) => request.status === 'Approved'),
    [stockRequests]
  );
  const extractApprovedYear = (approvedAt) => {
    if (!approvedAt) return 'Unknown';
    const date = new Date(approvedAt);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return String(date.getFullYear());
  };
  const availableYears = useMemo(() => {
    const years = new Set();
    approvedStockRequests.forEach((request) => {
      const year = extractApprovedYear(request.approvedAt);
      if (year !== 'Unknown') years.add(year);
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [approvedStockRequests]);
  useEffect(() => {
    if (selectedYearFilter !== 'all' && !availableYears.includes(selectedYearFilter)) {
      setSelectedYearFilter('all');
    }
  }, [selectedYearFilter, availableYears]);
  const filteredApprovedRequests = useMemo(() => {
    if (selectedYearFilter === 'all') return approvedStockRequests;
    return approvedStockRequests.filter((request) => extractApprovedYear(request.approvedAt) === selectedYearFilter);
  }, [approvedStockRequests, selectedYearFilter]);
  const priceByStockKey = useMemo(() => {
    const map = new Map();
    stockEntries.forEach((entry) => {
      map.set(`${entry.category}::${entry.item}`, Number(entry.price || 0));
    });
    return map;
  }, [stockEntries]);
  const maintenanceInsights = useMemo(() => {
    const itemUsage = new Map();
    const categoryUsage = new Map();
    const itemExpense = new Map();
    const yearExpense = new Map();
    let totalExpense = 0;
    filteredApprovedRequests.forEach((request) => {
      const quantityUsed = Number(request.quantity || 0);
      if (!Number.isFinite(quantityUsed) || quantityUsed <= 0) return;
      const itemLabel = `${request.item || 'Unknown'} (${request.category || 'Uncategorized'})`;
      const categoryLabel = request.category || 'Uncategorized';
      const stockKey = `${request.category || ''}::${request.item || ''}`;
      const unitPrice = Number(priceByStockKey.get(stockKey) || 0);
      const totalCost = quantityUsed * unitPrice;
      itemUsage.set(itemLabel, (itemUsage.get(itemLabel) || 0) + quantityUsed);
      categoryUsage.set(categoryLabel, (categoryUsage.get(categoryLabel) || 0) + quantityUsed);
      itemExpense.set(itemLabel, (itemExpense.get(itemLabel) || 0) + totalCost);
      const year = extractApprovedYear(request.approvedAt);
      yearExpense.set(year, (yearExpense.get(year) || 0) + totalCost);
      totalExpense += totalCost;
    });
    const toSortedRows = (map) =>
      Array.from(map.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    const toSortedYearRows = (map) =>
      Array.from(map.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => {
          const aYear = Number(a.label);
          const bYear = Number(b.label);
          if (Number.isFinite(aYear) && Number.isFinite(bYear)) return aYear - bYear;
          if (Number.isFinite(aYear)) return -1;
          if (Number.isFinite(bYear)) return 1;
          return String(a.label).localeCompare(String(b.label));
        });
    return {
      totalExpense,
      approvedCount: filteredApprovedRequests.length,
      mostUsedItems: toSortedRows(itemUsage).slice(0, 8),
      mostUsedCategories: toSortedRows(categoryUsage),
      itemWiseExpense: toSortedRows(itemExpense).slice(0, 8),
      yearWiseExpense: toSortedYearRows(yearExpense)
    };
  }, [filteredApprovedRequests, priceByStockKey]);
  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`
    }),
    [token]
  );
  const fetchCatalog = async () => {
    const res = await fetch(`${API_BASE}/api/stocks/catalog`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load stock catalog');
    const itemsByCategory = { ...(data.itemsByCategory || {}) };
    if (!itemsByCategory.paint) {
      itemsByCategory.paint = ['white color 10lts', 'brown color 10lts', 'grey color 10lts'];
    } else {
      const paintItems = new Set(itemsByCategory.paint);
      ['white color 10lts', 'brown color 10lts', 'grey color 10lts'].forEach((color) => paintItems.add(color));
      itemsByCategory.paint = Array.from(paintItems);
    }
    setStockItemsByCategory(itemsByCategory);
  };
  const fetchEntries = async () => {
    const res = await fetch(`${API_BASE}/api/stocks/entries`, { headers });
    if (res.status === 401) {
      localStorage.removeItem('stores_token');
      window.location.reload();
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load stock entries');
    setStockEntries(Array.isArray(data) ? data : []);
  };
  const fetchRequests = async () => {
    const res = await fetch(`${API_BASE}/api/stocks/requests`, { headers });
    if (res.status === 401) {
      localStorage.removeItem('stores_token');
      window.location.reload();
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load stock requests');
    setStockRequests(Array.isArray(data) ? data : []);
  };
  const fetchDeliveryPersons = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stocks/delivery-persons`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setDeliveryPersons(Array.isArray(data) ? data : []);
    } catch {
      // non-critical, ignore errors
    }
  };
  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchCatalog(), fetchEntries(), fetchRequests(), fetchDeliveryPersons()]);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (token) {
      fetchAll();
      loadAttendanceToday();
    }
  }, [token]);
  const resetStockForm = () => {
    setSelectedCategory('');
    setSelectedItem('');
    setQuantity('');
    setPrice('');
    setUpdatedOn(new Date().toISOString().slice(0, 10));
    setEditingEntryId('');
  };
  const startEditingEntry = (entry) => {
    setError('');
    setInfoMessage('');
    setEditingEntryId(entry._id || `${entry.category}-${entry.item}`);
    setSelectedCategory(entry.category || '');
    setSelectedItem(entry.item || '');
    setQuantity(String(entry.quantity ?? 0));
    setPrice(String(entry.price ?? 0));
    setUpdatedOn(
      entry.updatedOn ? new Date(entry.updatedOn).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    );
  };
  const submitStockItem = async () => {
    setError('');
    setInfoMessage('');
    if (!selectedCategory || !selectedItem || !updatedOn) {
      setError('Select category, item and update date.');
      return;
    }
    const parsedQty = Number(quantity);
    if (!Number.isFinite(parsedQty) || parsedQty < 0) {
      setError('Quantity must be a valid non-negative number.');
      return;
    }
    const parsedPrice = Number(price || 0);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Price must be a valid non-negative number.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/stocks/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          category: selectedCategory,
          item: selectedItem,
          quantity: parsedQty,
          price: parsedPrice,
          updatedOn
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to save stock item');
        return;
      }
      notification.success({
        message: editingEntryId ? 'Stock Item Updated' : 'Stock Item Saved',
        description: editingEntryId ? 'Stock item updated successfully.' : 'Stock item saved successfully!',
        placement: 'topRight',
        duration: 3
      });
      setInfoMessage('');
      resetStockForm();
      await fetchEntries();
    } catch {
      setError('Network error while saving stock item');
    }
  };
  const approveRequest = async (requestId) => {
    setError('');
    setInfoMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests/${requestId}/approve`, {
        method: 'PATCH',
        headers
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to approve request');
        return;
      }
      // Optimistically mark the item as Approved in local state so it stays visible
      setStockRequests((prev) =>
        prev.map((r) =>
          r._id === requestId
            ? { ...r, status: 'Approved', approvedAt: data.approvedAt || new Date().toISOString() }
            : r
        )
      );
      notification.success({
        message: 'Request Approved',
        description: 'Request approved successfully!',
        placement: 'topRight',
        duration: 3
      });
      setInfoMessage('');
      await Promise.all([fetchRequests(), fetchEntries()]);
    } catch {
      setError('Network error while approving request');
    }
  };
  const openAssignDelivery = (requestId) => {
    setAssigningRequestId(requestId);
    setAssigningPersonId('');
    setAssignError('');
  };
  const closeAssignDelivery = () => {
    setAssigningRequestId(null);
    setAssigningPersonId('');
    setAssignError('');
  };
  const submitAssignDelivery = async () => {
    if (!assigningPersonId) {
      setAssignError('Please select a delivery person.');
      return;
    }
    setAssignError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests/${assigningRequestId}/assign-delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ deliveryPersonId: assigningPersonId })
      });
      const data = await res.json();
      if (!res.ok) {
        setAssignError(data.message || 'Failed to assign delivery person');
        return;
      }
      notification.success({
        message: 'Delivery Assigned',
        description: 'Delivery person assigned successfully.',
        placement: 'topRight',
        duration: 3
      });
      closeAssignDelivery();
      await fetchRequests();
    } catch {
      setAssignError('Network error while assigning delivery person');
    }
  };
  // --- Begin full UI copied and adapted from ProcurementDashboard ---
  const renderEmptyChart = () => {
    return <div className="chart-empty">No approved data yet.</div>;
  };
  const renderVerticalBarChart = (rows, formatValue) => {
    if (!rows.length) {
      return renderEmptyChart();
    }
    const points = rows.slice(0, 8);
    const width = 560;
    const height = 250;
    const marginTop = 16;
    const marginRight = 12;
    const marginBottom = 64;
    const marginLeft = 12;
    const chartHeight = height - marginTop - marginBottom;
    const chartWidth = width - marginLeft - marginRight;
    const slotWidth = chartWidth / points.length;
    const barWidth = Math.max(22, slotWidth * 0.56);
    const maxValue = Math.max(1, ...points.map((row) => Number(row.value || 0)));
    return (
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="bar chart">
        {points.map((row, index) => {
          const value = Number(row.value || 0);
          const barHeight = Math.max(2, (value / maxValue) * chartHeight);
          const x = marginLeft + index * slotWidth + (slotWidth - barWidth) / 2;
          const y = marginTop + (chartHeight - barHeight);
          const color = chartPalette[index % chartPalette.length];
          const shortLabel = row.label.length > 14 ? `${row.label.slice(0, 14)}...` : row.label;
          return (
            <g key={row.label}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="6" fill={color} opacity="0.9" />
              <text x={x + barWidth / 2} y={marginTop + chartHeight + 18} className="chart-axis-label" textAnchor="middle">
                {shortLabel}
              </text>
              <text x={x + barWidth / 2} y={y - 6} className="chart-point-label" textAnchor="middle">
                {formatValue(row.value)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };
  const renderHorizontalBarChart = (rows, formatValue) => {
    if (!rows.length) {
      return renderEmptyChart();
    }
    const points = rows.slice(0, 8);
    const width = 560;
    const rowHeight = 34;
    const height = points.length * rowHeight + 16;
    const leftGutter = 170;
    const rightGutter = 72;
    const maxValue = Math.max(1, ...points.map((row) => Number(row.value || 0)));
    const maxBarWidth = width - leftGutter - rightGutter;
    return (
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="horizontal bar chart">
        {points.map((row, index) => {
          const value = Number(row.value || 0);
          const barWidth = Math.max(3, (value / maxValue) * maxBarWidth);
          const y = index * rowHeight + 8;
          const color = chartPalette[index % chartPalette.length];
          const shortLabel = row.label.length > 22 ? `${row.label.slice(0, 22)}...` : row.label;
          return (
            <g key={row.label}>
              <text x="6" y={y + 14} className="chart-axis-label" textAnchor="start" title={row.label}>
                {shortLabel}
              </text>
              <rect x={leftGutter} y={y} width={barWidth} height="16" rx="8" fill={color} opacity="0.9" />
              <text x={leftGutter + barWidth + 6} y={y + 13} className="chart-point-label" textAnchor="start">
                {formatValue(row.value)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };
  const renderDoughnutChart = (rows, formatValue) => {
    if (!rows.length) {
      return renderEmptyChart();
    }
    const points = rows.slice(0, 8);
    const total = points.reduce((sum, row) => sum + Number(row.value || 0), 0);
    if (!total) {
      return renderEmptyChart();
    }
    const size = 240;
    const center = size / 2;
    const radius = 78;
    const strokeWidth = 34;
    let cumulative = 0;
    return (
      <div className="donut-chart-wrap">
        <svg className="chart-svg donut-svg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="doughnut chart">
          {points.map((row, index) => {
            const value = Number(row.value || 0);
            const fraction = value / total;
            const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
            const endAngle = (cumulative + fraction) * 2 * Math.PI - Math.PI / 2;
            cumulative += fraction;
            const x1 = center + radius * Math.cos(startAngle);
            const y1 = center + radius * Math.sin(startAngle);
            const x2 = center + radius * Math.cos(endAngle);
            const y2 = center + radius * Math.sin(endAngle);
            const largeArcFlag = fraction > 0.5 ? 1 : 0;
            const color = chartPalette[index % chartPalette.length];
            return (
              <path
                key={row.label}
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            );
          })}
          <text x={center} y={center - 2} className="chart-donut-center-label" textAnchor="middle">
            Total
          </text>
          <text x={center} y={center + 18} className="chart-donut-center-value" textAnchor="middle">
            {formatValue(total)}
          </text>
        </svg>
        <div className="chart-legend">
          {points.map((row, index) => (
            <div className="chart-legend-item" key={row.label}>
              <span className="chart-legend-swatch" style={{ backgroundColor: chartPalette[index % chartPalette.length] }} />
              <span className="chart-legend-label" title={row.label}>{row.label}</span>
              <span className="chart-legend-value">{formatValue(row.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  const renderLineChart = (rows, formatValue) => {
    if (!rows.length) {
      return renderEmptyChart();
    }
    const width = 560;
    const height = 250;
    const margin = { top: 20, right: 24, bottom: 40, left: 32 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const maxValue = Math.max(1, ...rows.map((row) => Number(row.value || 0)));
    const stepX = rows.length > 1 ? chartWidth / (rows.length - 1) : 0;
    const points = rows.map((row, index) => {
      const x = margin.left + index * stepX;
      const value = Number(row.value || 0);
      const y = margin.top + chartHeight - (value / maxValue) * chartHeight;
      return { ...row, x, y };
    });
    const path = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    return (
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="line chart">
        <line
          x1={margin.left}
          y1={margin.top + chartHeight}
          x2={width - margin.right}
          y2={margin.top + chartHeight}
          className="chart-axis-line"
        />
        <path d={path} className="chart-line-path" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4" className="chart-line-point" />
            <text x={point.x} y={margin.top + chartHeight + 16} className="chart-axis-label" textAnchor="middle">
              {point.label}
            </text>
            <text x={point.x} y={point.y - 8} className="chart-point-label" textAnchor="middle">
              {formatValue(point.value)}
            </text>
          </g>
        ))}
      </svg>
    );
  };
  return (
    <div className="app-shell">
      <div className="app-card">
        <div className="app-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {companyLogo && (
              <img
                src={companyLogo}
                alt="Company logo"
                style={{ height: '75px', objectFit: 'contain' }}
              />
            )}
            <div>
              <div className="app-title">Stores Portal</div>
              <div className="app-subtitle">Add stock items and process technician requests</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-outline btn-small"
              onClick={() => { setShowAttendanceModal(true); loadAttendanceToday(); }}
            >
              {attendanceToday.punchIn && !attendanceToday.punchOut ? 'Punch Out' : attendanceToday.punchOut ? 'Attendance ✓' : 'Punch In'}
            </button>
            <button
              className="btn-outline btn-small"
              onClick={() => {
                localStorage.removeItem('stores_token');
                onLogout();
              }}
            >
              Logout
            </button>
          </div>
        </div>
        <div className="app-main">
          <div className="tabs-row">
            <button
              type="button"
              className={'tab-button' + (activeTab === 'dashboard' ? ' active' : '')}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={'tab-button' + (activeTab === 'stock-items' ? ' active' : '')}
              onClick={() => setActiveTab('stock-items')}
            >
              Stock Items
            </button>
            <button
              type="button"
              className={'tab-button' + (activeTab === 'requests' ? ' active' : '')}
              onClick={() => setActiveTab('requests')}
            >
              Item Requests
            </button>
          </div>
          {error && <p className="text-danger">{error}</p>}
          {infoMessage && <p className="text-success">{infoMessage}</p>}
          {activeTab === 'dashboard' && (
            <div className="dashboard-wrap">
              <div className="dashboard-filter-row">
                <div className="field dashboard-year-filter">
                  <label>Filter By Year</label>
                  <select
                    value={selectedYearFilter}
                    onChange={(e) => setSelectedYearFilter(e.target.value)}
                  >
                    <option value="all">All Years</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="dashboard-summary-grid">
                <div className="summary-card">
                  <div className="summary-label">
                    Total Maintenance Cost{selectedYearFilter !== 'all' ? ` (${selectedYearFilter})` : ''}
                  </div>
                  <div className="summary-value">{formatCurrency(maintenanceInsights.totalExpense)}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">
                    Approved Item Requests{selectedYearFilter !== 'all' ? ` (${selectedYearFilter})` : ''}
                  </div>
                  <div className="summary-value">{maintenanceInsights.approvedCount}</div>
                </div>
              </div>
              <div className="dashboard-grid">
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-title">Most Used Items</div>
                    <span className="chip">Item level</span>
                  </div>
                  {renderVerticalBarChart(maintenanceInsights.mostUsedItems, (value) => Number(value || 0))}
                </div>
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-title">Most Used Categories</div>
                    <span className="chip">Category level</span>
                  </div>
                  {renderDoughnutChart(maintenanceInsights.mostUsedCategories, (value) => Number(value || 0))}
                </div>
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-title">Most Cost Expense Item Wise</div>
                    <span className="chip">By item</span>
                  </div>
                  {renderHorizontalBarChart(maintenanceInsights.itemWiseExpense, (value) => formatCurrency(value))}
                </div>
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-title">Year Wise Maintenance Cost</div>
                    <span className="chip">By year</span>
                  </div>
                  {renderLineChart(maintenanceInsights.yearWiseExpense, (value) => formatCurrency(value))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'stock-items' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">Add / Update Stock Items</div>
                <span className="chip">{stockEntries.length} items</span>
              </div>
              {editingEntryId && (
                <div className="edit-banner">
                  <span>Editing selected stock item</span>
                  <button className="btn-outline btn-small" type="button" onClick={resetStockForm}>
                    Cancel
                  </button>
                </div>
              )}
              <div className="form-grid">
                <div className="field">
                  <label>Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedItem('');
                    }}
                    disabled={loading || Boolean(editingEntryId)}
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Item</label>
                  <select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    disabled={!selectedCategory || loading || Boolean(editingEntryId)}
                  >
                    <option value="">Select item</option>
                    {itemOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />
                </div>
                <div className="field">
                  <label>Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
                <div className="field">
                  <label>Updated On</label>
                  <input
                    type="date"
                    value={updatedOn}
                    onChange={(e) => setUpdatedOn(e.target.value)}
                  />
                </div>
                <div className="field field-submit">
                  <label>&nbsp;</label>
                  <button className="btn-primary" type="button" onClick={submitStockItem}>
                    {editingEntryId ? 'Update' : 'Submit'}
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Item Price</th>
                      <th>Total Price</th>
                      <th>Updated On</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockEntries.length === 0 && (
                      <tr>
                        <td colSpan="8" className="muted-cell">
                          No stock items available.
                        </td>
                      </tr>
                    )}
                    {stockEntries.map((entry) => (
                      <tr key={entry._id}>
                        <td>{entry.category}</td>
                        <td>{entry.item}</td>
                        <td>{entry.quantity ?? 0}</td>
                        <td>{formatCurrency(entry.price)}</td>
                        <td>{formatCurrency(Number(entry.quantity || 0) * Number(entry.price || 0))}</td>
                        <td>{entry.updatedOn ? new Date(entry.updatedOn).toLocaleDateString() : '-'}</td>
                        <td>{Number(entry.quantity || 0) > 0 ? 'Available' : 'Not Available'}</td>
                        <td>
                          <button
                            className="btn-small btn-outline"
                            type="button"
                            onClick={() => startEditingEntry(entry)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'requests' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">Procurement Item Requests</div>
                <span className="chip">{stockRequests.filter((r) => r.status === 'ProcurementRequested').length} pending</span>
              </div>
              {assigningRequestId && (
                <div className="assign-delivery-modal">
                  <div className="assign-delivery-panel">
                    <div className="assign-delivery-title">Assign Delivery Person</div>
                    {deliveryPersons.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: '13px' }}>
                        No delivery persons available. Please create a delivery user first.
                      </p>
                    ) : (
                      <div className="field" style={{ marginBottom: '10px' }}>
                        <label>Select Delivery Person</label>
                        <select
                          value={assigningPersonId}
                          onChange={(e) => setAssigningPersonId(e.target.value)}
                        >
                          <option value="">-- Select --</option>
                          {deliveryPersons.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name}{p.phone ? ` (${p.phone})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {assignError && <p className="text-danger" style={{ fontSize: '12px' }}>{assignError}</p>}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button className="btn-primary btn-small" type="button" onClick={submitAssignDelivery}>
                        Assign
                      </button>
                      <button className="btn-outline btn-small" type="button" onClick={closeAssignDelivery}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Tenant</th>
                      <th>Requested By</th>
                      <th>Requested On</th>
                      <th>Comments</th>
                      <th>Status</th>
                      <th>Approved On</th>
                      <th>Delivery Person</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockRequests.length === 0 && (
                      <tr>
                        <td colSpan="11" className="muted-cell">
                          No procurement requests received yet.
                        </td>
                      </tr>
                    )}
                    {stockRequests.map((request) => (
                      <tr key={request._id}>
                        <td>{request.category}</td>
                        <td>{request.item}</td>
                        <td>{request.quantity}</td>
                        <td>
                          {request.tenantFlatNumber
                            ? `Flat ${request.tenantFlatNumber}${request.tenantBlock ? `, Block ${request.tenantBlock}` : ''}`
                            : '-'}
                        </td>
                        <td>{request.requestedBy?.name || '-'}</td>
                        <td>{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-'}</td>
                        <td>{request.comments || '-'}</td>
                        <td>
                          <span className={`status-pill status-${
                            request.status === 'Approved' ? 'approved'
                            : request.status === 'Dispatched' ? 'dispatched'
                            : request.status === 'Delivered' ? 'delivered'
                            : 'pending'
                          }`}>
                            {request.status === 'ProcurementRequested' ? 'Pending' : request.status}
                          </span>
                        </td>
                        <td>
                          {request.approvedAt
                            ? new Date(request.approvedAt).toLocaleString()
                            : '-'}
                        </td>
                        <td>
                          {request.assignedTo
                            ? request.assignedTo.name
                            : '-'}
                        </td>
                        <td>
                          {request.status === 'ProcurementRequested' ? (
                            <button
                              className="btn-small btn-primary"
                              type="button"
                              onClick={() => approveRequest(request._id)}
                            >
                              Approve
                            </button>
                          ) : request.status === 'Approved' ? (
                            <button
                              className="btn-small btn-outline"
                              type="button"
                              onClick={() => openAssignDelivery(request._id)}
                            >
                              Assign Delivery
                            </button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAttendanceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px', minWidth: '320px', maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>Attendance</div>
            <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '90px', color: '#374151', fontWeight: 600, fontSize: '13px' }}>Punch In</span>
                <span style={{ fontSize: '14px' }}>
                  {attendanceToday.punchIn
                    ? <span style={{ color: '#16a34a', fontWeight: 600 }}>{new Date(attendanceToday.punchIn).toLocaleTimeString()}</span>
                    : <span style={{ color: '#9ca3af' }}>Not recorded</span>}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '90px', color: '#374151', fontWeight: 600, fontSize: '13px' }}>Punch Out</span>
                <span style={{ fontSize: '14px' }}>
                  {attendanceToday.punchOut
                    ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{new Date(attendanceToday.punchOut).toLocaleTimeString()}</span>
                    : <span style={{ color: '#9ca3af' }}>Not recorded</span>}
                </span>
              </div>
            </div>
            {attendanceError && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '10px' }}>{attendanceError}</p>}
            {attendanceMsg && <p style={{ color: '#16a34a', fontSize: '13px', marginBottom: '10px' }}>{attendanceMsg}</p>}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {!attendanceToday.punchIn && (
                <button className="btn-primary btn-small" onClick={doPunchIn} disabled={attendanceBusy}>
                  {attendanceBusy ? 'Please wait…' : 'Punch In'}
                </button>
              )}
              {attendanceToday.punchIn && !attendanceToday.punchOut && (
                <button className="btn-primary btn-small" onClick={doPunchOut} disabled={attendanceBusy}>
                  {attendanceBusy ? 'Please wait…' : 'Punch Out'}
                </button>
              )}
              <button className="btn-outline btn-small" onClick={() => { setShowAttendanceModal(false); setAttendanceError(''); setAttendanceMsg(''); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('stores_token'));
  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <StoresDashboard onLogout={() => setLoggedIn(false)} />;
}

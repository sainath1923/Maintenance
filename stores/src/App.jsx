import { useState, useMemo, useEffect } from 'react';
import { Row, Col, Tabs, notification } from 'antd';
import 'antd/dist/reset.css';
import { useCompanyLogo } from './hooks';
import API_BASE from './api';
import Login from './components/Login';
import AttendanceModal from './components/AttendanceModal';
import Dashboard from './components/Dashboard';
import StockItems from './components/StockItems';
import ItemRequests from './components/ItemRequests';

function StoresDashboard({ onLogout }) {
  const [stockEntries, setStockEntries] = useState([]);
  const [stockRequests, setStockRequests] = useState([]);
  const [stockItemsByCategory, setStockItemsByCategory] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const companyLogo = useCompanyLogo();
  const token = localStorage.getItem('stores_token');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchCatalog = async () => {
    const res = await fetch(`${API_BASE}/api/stocks/catalog`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load stock catalog');
    const itemsByCategory = { ...(data.itemsByCategory || {}) };
    if (!itemsByCategory.paint) {
      itemsByCategory.paint = ['white color 10lts', 'brown color 10lts', 'grey color 10lts'];
    } else {
      const paintSet = new Set(itemsByCategory.paint);
      ['white color 10lts', 'brown color 10lts', 'grey color 10lts'].forEach((c) => paintSet.add(c));
      itemsByCategory.paint = Array.from(paintSet);
    }
    setStockItemsByCategory(itemsByCategory);
  };

  const fetchEntries = async () => {
    const res = await fetch(`${API_BASE}/api/stocks/entries`, { headers });
    if (res.status === 401) { localStorage.removeItem('stores_token'); window.location.reload(); return; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load stock entries');
    setStockEntries(Array.isArray(data) ? data : []);
  };

  const fetchRequests = async () => {
    const res = await fetch(`${API_BASE}/api/stocks/requests`, { headers });
    if (res.status === 401) { localStorage.removeItem('stores_token'); window.location.reload(); return; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load stock requests');
    setStockRequests(Array.isArray(data) ? data : []);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchCatalog(), fetchEntries(), fetchRequests()]);
    } catch (err) {
      notification.error({ message: err.message || 'Failed to load data', placement: 'topRight', duration: 4 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  const tabItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      children: <Dashboard stockEntries={stockEntries} stockRequests={stockRequests} />,
    },
    {
      key: 'stock-items',
      label: 'Stock Items',
      children: (
        <StockItems
          token={token}
          stockEntries={stockEntries}
          stockItemsByCategory={stockItemsByCategory}
          onRefresh={fetchAll}
        />
      ),
    },
    {
      key: 'requests',
      label: 'Item Requests',
      children: <ItemRequests token={token} stockRequests={stockRequests} onRefresh={fetchAll} />,
    },
  ];

  return (
    <div className="app-shell">
      <div className="app-card">
        <Row justify="space-between" align="middle" className="app-card-header">
          <Col>
            <div className="header-logo-group">
              {companyLogo && (
                <img src={companyLogo} alt="Company logo" className="header-logo-img" />
              )}
              <div>
                <div className="app-title">Stores Portal</div>
                <div className="app-subtitle">Add stock items and process technician requests</div>
              </div>
            </div>
          </Col>
          <Col>
            <div className="header-actions">
              <button className="btn-outline btn-small" onClick={() => setShowAttendance(true)}>
                Attendance
              </button>
              <button
                className="btn-outline btn-small"
                onClick={() => { localStorage.removeItem('stores_token'); onLogout(); }}
              >
                Logout
              </button>
            </div>
          </Col>
        </Row>
        <div className="app-main">
          <Tabs items={tabItems} />
        </div>
      </div>
      <AttendanceModal token={token} open={showAttendance} onClose={() => setShowAttendance(false)} />
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('stores_token') || '');
  if (!token) return <Login onLogin={(t) => setToken(t)} />;
  return <StoresDashboard onLogout={() => setToken('')} />;
}

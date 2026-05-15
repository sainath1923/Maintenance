import React, { useEffect, useState } from 'react';
import { notification } from 'antd';
import 'antd/dist/reset.css';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : '');

async function parseApiResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

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
      } catch {
        // ignore logo errors
      }
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
      } catch {
        // ignore errors
      }
    };
    load();
  }, []);

  return building;
}

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('sup1@example.com');
  const [password, setPassword] = useState('Supervisor@123');
  const [error, setError] = useState('');

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
      if (data.role !== 'supervisor') {
        setError('This portal is only for supervisors');
        return;
      }
      localStorage.setItem('supervisor_token', data.token);
      onLoggedIn();
    } catch (err) {
      setError('Network error');
    }
  };

  const companyLogo = useCompanyLogo();
  const buildingName = useBuildingName();

  return (
    <div className="app-shell">
      <div className="app-card">
        <div className="app-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {companyLogo && (
              <img
                src={companyLogo}
                alt="Company logo"
                style={{ height: '36px', objectFit: 'contain' }}
              />
            )}
            <div>
              <div className="app-title">Supervisor Console</div>
              <div className="app-subtitle">Sign in to manage assigned jobs</div>
            </div>
          </div>
          {/* {buildingName && <div className="header-building-name">{buildingName}</div>} */}
          <div className="app-badge">Field Operations</div>
        </div>
        <div className="app-main">
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Sign in</div>
              <span className="chip">Supervisor</span>
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

function SupervisorDashboard({ onLogout }) {
  const [requests, setRequests] = useState([]);
  const [statusById, setStatusById] = useState({});
  const [commentById, setCommentById] = useState({});
  const [technicians, setTechnicians] = useState([]);
  const [assignment, setAssignment] = useState({});
  const [drawerRequestId, setDrawerRequestId] = useState(null);
  const [skillFilters, setSkillFilters] = useState({
    ac: false,
    electrician: false,
    plumber: false,
    carpenter: false,
    painter: false,
    other: false
  });
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'dashboard' | 'stocks' | 'item-requests'
  const [stocksLoading, setStocksLoading] = useState(false);
  const [stocksError, setStocksError] = useState('');
  const [stockEntries, setStockEntries] = useState([]);
  const [stockRequests, setStockRequests] = useState([]);
  const [stockRequestsError, setStockRequestsError] = useState('');

  const companyLogo = useCompanyLogo();
  const buildingName = useBuildingName();

  const token = localStorage.getItem('supervisor_token');

  const fetchAssigned = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/requests/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to load tasks');
        return;
      }
      setRequests(data);
    } catch (err) {
      setError('Network error');
    }
  };

  const fetchTechnicians = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/users/technicians`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to load technicians');
        return;
      }
      setTechnicians(data);
    } catch (err) {
      setError('Network error');
    }
  };

  const filteredTechniciansByType = (type) => {
    return technicians.filter((t) => t.technicianType === type);
  };

  const fetchStockEntries = async () => {
    setStocksError('');
    setStocksLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stocks/entries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setStocksError(data.message || 'Failed to load stock entries');
        return;
      }
      setStockEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setStocksError('Network error while loading stock entries');
    } finally {
      setStocksLoading(false);
    }
  };

  const fetchStockRequests = async () => {
    setStockRequestsError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setStockRequestsError(data.message || 'Failed to load item requests');
        return;
      }
      setStockRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setStockRequestsError('Network error while loading item requests');
    }
  };

  useEffect(() => {
    if (token) {
      fetchAssigned();
      fetchTechnicians();
      fetchStockEntries();
      fetchStockRequests();
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchStockRequests();
      fetchStockEntries();
    }, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const updateStatus = async (id) => {
    setError('');
    const status = statusById[id] || (requests.find((r) => r._id === id)?.status || 'Pending');
    const notes = commentById[id] || '';
    try {
      const res = await fetch(`${API_BASE}/api/requests/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, notes })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to update status');
        return;
      }
      fetchAssigned();
    } catch (err) {
      setError('Network error');
    }
  };

  const assignTechnician = async (id) => {
    setError('');
    setInfoMessage('');
    const technicianId = assignment[id];
    if (!technicianId) return;
    try {
      const res = await fetch(`${API_BASE}/api/requests/${id}/assign-technician`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ technicianId })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to assign technician');
        return;
      }
      // simple visual feedback and refresh list so assignment is reflected
      setAssignment((prev) => ({ ...prev, [id]: '' }));
      notification.success({
        message: 'Ticket Assigned',
        description: 'Ticket assigned to technician successfully!',
        placement: 'topRight',
        duration: 3
      });
      setInfoMessage('');
      await fetchAssigned();
    } catch (err) {
      setError('Network error');
    }
  };

  const totalTasks = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const inProgressCount = requests.filter((r) => r.status === 'In Progress').length;
  const completedCount = requests.filter((r) => r.status === 'Completed').length;

  const priorityCounts = requests.reduce(
    (acc, r) => {
      const key = r.priority || 'Low';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {}
  );

  const statusCounts = requests.reduce(
    (acc, r) => {
      const key = r.status || 'Pending';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {}
  );

  const maxPriorityValue = Math.max(1, ...Object.values(priorityCounts));
  const maxStatusValue = Math.max(1, ...Object.values(statusCounts));

  const technicianUsage = requests.reduce((acc, r) => {
    if (r.technician) {
      acc[r.technician] = (acc[r.technician] || 0) + 1;
    }
    return acc;
  }, {});

  const topTechnicians = Object.entries(technicianUsage)
    .map(([id, count]) => {
      const tech = technicians.find((t) => t._id === id);
      return tech ? { tech, count } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const categoryCounts = requests.reduce(
    (acc, r) => {
      const key = r.maintenanceCategory || 'Other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {}
  );

  const maxCategoryValue = Math.max(1, ...Object.values(categoryCounts));

  const now = new Date();
  const monthBuckets = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'short' });
    monthBuckets.push({ key, label });
  }

  const monthlyTrend = monthBuckets.map((bucket) => {
    const count = requests.filter((r) => {
      if (!r.createdAt) return false;
      const created = new Date(r.createdAt);
      const createdKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      return createdKey === bucket.key;
    }).length;
    return { ...bucket, count };
  });

  const maxMonthlyValue = Math.max(1, ...monthlyTrend.map((m) => m.count));
  return (
    <div className="app-shell">
      <div className="app-card">
        <div className="app-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {companyLogo && (
              <img
                src={companyLogo}
                alt="Company logo"
                style={{ height: '36px', objectFit: 'contain' }}
              />
            )}
            <div>
              <div className="app-title">Supervisor Portal</div>
              <div className="app-subtitle">Work through assigned maintenance tasks</div>
            </div>
          </div>
          {/* {buildingName && <div className="header-building-name">{buildingName}</div>} */}
          <button
            className="btn-outline btn-small"
            onClick={() => {
              localStorage.removeItem('supervisor_token');
              onLogout();
            }}
          >
            Logout
          </button>
        </div>

        <div className="app-main">
          <div className="tabs-row">
            <button
              type="button"
              className={"tab-button" + (activeTab === 'requests' ? ' active' : '')}
              onClick={() => setActiveTab('requests')}
            >
              Requests
            </button>
            <button
              type="button"
              className={"tab-button" + (activeTab === 'dashboard' ? ' active' : '')}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={"tab-button" + (activeTab === 'stocks' ? ' active' : '')}
              onClick={() => setActiveTab('stocks')}
            >
              Stocks
            </button>
            <button
              type="button"
              className={"tab-button" + (activeTab === 'item-requests' ? ' active' : '')}
              onClick={() => {
                setActiveTab('item-requests');
                fetchStockRequests();
              }}
            >
              Item Requests
            </button>
          </div>

          {activeTab === 'requests' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">Assigned tasks</div>
                <span className="chip">{requests.length} tasks</span>
              </div>
              {error && <p className="text-danger">{error}</p>}
              {infoMessage && <p className="text-success">{infoMessage}</p>}
              <ul className="list-scroll">
                {requests.map((r) => (
                  <li key={r._id}>
                    <div className="ticket-row">
                      <div className="ticket-main">
                        <div className="ticket-header-row">
                          <div className="ticket-title">{r.title}</div>
                          <span
                            className={
                              'status-pill ' +
                              `status-${(r.status || '')
                                .toLowerCase()
                                .replace(/\s+/g, '-')}`
                            }
                          >
                            {r.status}
                          </span>
                        </div>
                        <div className="ticket-subline">
                          <span className="ticket-label">Flat</span> {r.flatNumber || '-'},
                          {' '}
                          {r.block || 'No block'}
                        </div>
                        <div className="ticket-subline">
                          <span className="ticket-label">Type:</span> {r.requestType || '-'} ·{' '}
                          <span className="ticket-label">Category:</span> {r.maintenanceCategory ||
                            '-'}{' '}
                          · <span className="ticket-label">Priority:</span> {r.priority}
                        </div>
                        {r.technician && (
                          <div className="ticket-subline">
                            <span className="ticket-label">Assigned to</span>{' '}
                            {(() => {
                              const tech = technicians.find((t) => t._id === r.technician);
                              return tech
                                ? `${tech.name}${tech.technicianType ? ` (${tech.technicianType})` : ''}`
                                : 'Technician';
                            })()}
                          </div>
                        )}
                        {editingStatusId === r._id && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div className="field" style={{ marginBottom: '4px' }}>
                              <label>Status</label>
                              <select
                                value={statusById[r._id] || r.status}
                                onChange={(e) =>
                                  setStatusById((prev) => ({ ...prev, [r._id]: e.target.value }))
                                }
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </div>
                            <div className="field" style={{ marginBottom: '4px' }}>
                              <label>Comment</label>
                              <input
                                value={commentById[r._id] || ''}
                                onChange={(e) =>
                                  setCommentById((prev) => ({
                                    ...prev,
                                    [r._id]: e.target.value
                                  }))
                                }
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn-small btn-primary"
                                type="button"
                                onClick={async () => {
                                  await updateStatus(r._id);
                                  setEditingStatusId(null);
                                }}
                              >
                                Submit
                              </button>
                              <button
                                className="btn-small btn-outline"
                                type="button"
                                onClick={() => setEditingStatusId(null)}
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="ticket-actions">
                        <button
                          className="btn-small btn-primary"
                          type="button"
                          onClick={() => setEditingStatusId(r._id)}
                        >
                          Update status
                        </button>
                        <button
                          className="btn-small btn-view"
                          type="button"
                          onClick={() => setDrawerRequestId(r._id)}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="card dashboard-card">
              <div className="card-header-row">
                <div className="card-title">Overview</div>
                <span className="chip">Live view</span>
              </div>
              {error && <p className="text-danger">{error}</p>}
              <div className="dashboard-grid">
                <div className="dashboard-metrics">
                  <div className="metric-card">
                    <div className="metric-label">Total tasks</div>
                    <div className="metric-value">{totalTasks}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Pending</div>
                    <div className="metric-value">{pendingCount}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">In progress</div>
                    <div className="metric-value">{inProgressCount}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Completed</div>
                    <div className="metric-value">{completedCount}</div>
                  </div>
                </div>
                <div className="dashboard-chart">
                  <div className="section-title">By priority</div>
                  <div className="bar-section">
                    {['High', 'Medium', 'Low'].map((p) => {
                      const value = priorityCounts[p] || 0;
                      const width = (value / maxPriorityValue) * 100;
                      return (
                        <div className="bar-row" key={p}>
                          <span className="bar-label">{p}</span>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${width}%` }} />
                          </div>
                          <span className="bar-count">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="dashboard-chart">
                  <div className="section-title">By status</div>
                  <div className="bar-section">
                    {Object.entries(statusCounts).map(([status, value]) => {
                      const width = (value / maxStatusValue) * 100;
                      return (
                        <div className="bar-row" key={status}>
                          <span className="bar-label">{status}</span>
                          <div className="bar-track">
                            <div className="bar-fill bar-fill-secondary" style={{ width: `${width}%` }} />
                          </div>
                          <span className="bar-count">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="dashboard-chart">
                  <div className="section-title">Top technicians</div>
                  {topTechnicians.length === 0 && (
                    <div className="text-muted" style={{ fontSize: '12px' }}>
                      No assignments yet.
                    </div>
                  )}
                  {topTechnicians.map(({ tech, count }) => (
                    <div className="bar-row" key={tech._id}>
                      <span className="bar-label">
                        {tech.name}
                        {tech.technicianType ? ` (${tech.technicianType})` : ''}
                      </span>
                      <div className="bar-track">
                        <div
                          className="bar-fill bar-fill-accent"
                          style={{
                            width: `${(count / (topTechnicians[0]?.count || 1)) * 100}%`
                          }}
                        />
                      </div>
                      <span className="bar-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dashboard-row-50">
                <div className="dashboard-chart dashboard-half">
                  <div className="section-title">Live trend (6 months)</div>
                  <div className="line-chart">
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="1.8"
                        points={monthlyTrend
                          .map((m, idx) => {
                            const x =
                              monthlyTrend.length === 1
                                ? 50
                                : (idx / (monthlyTrend.length - 1)) * 100;
                            const y = 35 - (m.count / maxMonthlyValue) * 28;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                      {monthlyTrend.map((m, idx) => {
                        const x =
                          monthlyTrend.length === 1
                            ? 50
                            : (idx / (monthlyTrend.length - 1)) * 100;
                        const y = 35 - (m.count / maxMonthlyValue) * 28;
                        return <circle key={m.key} cx={x} cy={y} r={1.7} className="line-point" />;
                      })}
                      <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#93c5fd" />
                          <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="line-chart-labels">
                      {monthlyTrend.map((m) => (
                        <span key={m.key}>{m.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="dashboard-chart dashboard-half">
                  <div className="section-title">By category (overall)</div>
                  <div className="bar-section">
                    {Object.entries(categoryCounts).map(([category, value]) => {
                      const width = (value / maxCategoryValue) * 100;
                      return (
                        <div className="bar-row" key={category}>
                          <span className="bar-label">{category}</span>
                          <div className="bar-track">
                            <div
                              className="bar-fill bar-fill-secondary"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <span className="bar-count">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stocks' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">Stocks</div>
                <span className="chip">Stock availability</span>
              </div>
              {stocksError && <p className="text-danger">{stocksError}</p>}
              <div className="stocks-table-wrap">
                <table className="stocks-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Item</th>
                      <th>Status</th>
                      <th>Quantity</th>
                      <th>Updated On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockEntries.length === 0 && !stocksLoading && (
                      <tr>
                        <td colSpan="5" className="stocks-empty-row">
                          No stock entries submitted yet.
                        </td>
                      </tr>
                    )}
                    {stockEntries.map((entry) => (
                      <tr key={entry._id || `${entry.category}-${entry.item}`}>
                        <td>{entry.category}</td>
                        <td>{entry.item}</td>
                        <td>{entry.isAvailable ? 'Available' : 'Not Available'}</td>
                        <td>{entry.isAvailable ? entry.quantity : '-'}</td>
                        <td>
                          {entry.updatedOn
                            ? new Date(entry.updatedOn).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'item-requests' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">Technician Item Requests</div>
                <span className="chip">{stockRequests.length} requests</span>
              </div>
              {stockRequestsError && <p className="text-danger">{stockRequestsError}</p>}
              <div className="stocks-table-wrap">
                <table className="stocks-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Tenant</th>
                      <th>Requested By</th>
                      <th>Comments</th>
                      <th>Status</th>
                      <th>Approved On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockRequests.length === 0 && (
                      <tr>
                        <td colSpan="8" className="stocks-empty-row">
                          No item requests raised yet.
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
                        <td>{request.comments || '-'}</td>
                        <td>{request.status}</td>
                        <td>{request.approvedAt ? new Date(request.approvedAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      {drawerRequestId && (
        <div className="drawer-backdrop" onClick={() => setDrawerRequestId(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const r = requests.find((x) => x._id === drawerRequestId);
              if (!r) return null;
              return (
                <>
                  <div className="drawer-header">
                    <div>
                      <div className="drawer-title">Ticket details</div>
                      <div className="text-muted">{r._id}</div>
                    </div>
                    <button className="btn-small btn-outline" onClick={() => setDrawerRequestId(null)}>
                      Close
                    </button>
                  </div>
                  <div className="drawer-body">
                    <div>
                      <div className="drawer-details-header">
                        <div>
                          <div className="drawer-section-title">Details</div>
                          <div>{r.title}</div>
                        </div>
                        <span
                          className={
                            'status-pill ' +
                            `status-${(r.status || '')
                              .toLowerCase()
                              .replace(/\s+/g, '-')}`
                          }
                        >
                          {r.status}
                        </span>
                      </div>
                      <div className="details-row">
                        <div className="detail-item">
                          <div className="text-muted">Flat / Block</div>
                          <div>
                            {r.flatNumber || '-'} / {r.block || 'No block'}
                          </div>
                        </div>
                        <div className="detail-item">
                          <div className="text-muted">Type</div>
                          <div>{r.requestType || '-'}</div>
                        </div>
                        <div className="detail-item">
                          <div className="text-muted">Category</div>
                          <div>{r.maintenanceCategory || '-'}</div>
                        </div>
                        <div className="detail-item">
                          <div className="text-muted">Priority</div>
                          <div>{r.priority}</div>
                        </div>
                        {r.technician && (
                          <div className="detail-item" style={{ flexBasis: '100%' }}>
                            <div className="text-muted">Technician</div>
                            {(() => {
                              const tech = technicians.find((t) => t._id === r.technician);
                              if (!tech) {
                                return <div className="text-muted">-</div>;
                              }
                              const phone = tech.phone || '';
                              const label = `${tech.name}${
                                tech.technicianType ? ` (${tech.technicianType})` : ''
                              }`;
                              return (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flexWrap: 'wrap'
                                  }}
                                >
                                  <span>{label}</span>
                                  {phone && (
                                    <>
                                      <span className="text-muted">{phone}</span>
                                      <button
                                        type="button"
                                        className="btn-small btn-outline"
                                        onClick={() => {
                                          if (navigator.clipboard) {
                                            navigator.clipboard.writeText(phone).catch(() => {});
                                          }
                                        }}
                                      >
                                        Copy
                                      </button>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        <div className="detail-item" style={{ flexBasis: '100%' }}>
                          <div className="text-muted">Invoice</div>
                          <div>
                            {r.invoiceUrl ? (
                              <a
                                href={`${API_BASE}${r.invoiceUrl}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View invoice
                              </a>
                            ) : (
                              <span className="text-muted">No invoice uploaded</span>
                            )}
                          </div>
                        </div>
                        <div className="detail-item">
                          <div className="text-muted">Comments</div>
                          <div className="text-muted">{r.description || '-'}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="drawer-section-title">Assign</div>
                      <div className="checkbox-group">
                        <div className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={skillFilters.ac}
                            onChange={(e) =>
                              setSkillFilters((prev) => ({ ...prev, ac: e.target.checked }))
                            }
                          />
                          <span>AC Technician</span>
                        </div>
                        <div className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={skillFilters.electrician}
                            onChange={(e) =>
                              setSkillFilters((prev) => ({
                                ...prev,
                                electrician: e.target.checked
                              }))
                            }
                          />
                          <span>Electrician</span>
                        </div>
                        <div className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={skillFilters.plumber}
                            onChange={(e) =>
                              setSkillFilters((prev) => ({ ...prev, plumber: e.target.checked }))
                            }
                          />
                          <span>Plumber</span>
                        </div>
                        <div className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={skillFilters.carpenter}
                            onChange={(e) =>
                              setSkillFilters((prev) => ({
                                ...prev,
                                carpenter: e.target.checked
                              }))
                            }
                          />
                          <span>Carpenter</span>
                        </div>
                        <div className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={skillFilters.painter}
                            onChange={(e) =>
                              setSkillFilters((prev) => ({ ...prev, painter: e.target.checked }))
                            }
                          />
                          <span>Painter</span>
                        </div>
                        <div className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={skillFilters.other}
                            onChange={(e) =>
                              setSkillFilters((prev) => ({ ...prev, other: e.target.checked }))
                            }
                          />
                          <span>Others</span>
                        </div>
                      </div>
                      <div className="field">
                        <label>Select technician</label>
                        <select
                          value={assignment[r._id] || ''}
                          onChange={(e) =>
                            setAssignment((prev) => ({
                              ...prev,
                              [r._id]: e.target.value
                            }))
                          }
                        >
                          <option value="">Select</option>
                          {(() => {
                            // Get selected skill types
                            const selectedSkills = Object.entries(skillFilters)
                              .filter(([key, val]) => val)
                              .map(([key]) => key);
                            // If none selected, show all
                            let filtered = technicians;
                            if (selectedSkills.length > 0) {
                              filtered = technicians.filter((t) =>
                                t.technicianType && selectedSkills.some(skill => {
                                  // Normalize for matching
                                  const skillMap = {
                                    ac: 'ac',
                                    electrician: 'electrician',
                                    plumber: 'plumber',
                                    carpenter: 'carpenter',
                                    painter: 'painter',
                                    other: 'other'
                                  };
                                  return t.technicianType.toLowerCase() === skillMap[skill];
                                })
                              );
                            }
                            return filtered.map((t) => (
                              <option key={t._id} value={t._id}>
                                {t.name} {t.technicianType ? `(${t.technicianType})` : ''}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <button
                          className="btn-small btn-primary"
                          type="button"
                          onClick={() => {
                            const pick = assignment[r._id];
                            if (pick) {
                              assignTechnician(r._id);
                            }
                          }}
                        >
                          Save assignment
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="drawer-section-title">Technician comments</div>
                      <div className="text-muted">{r.notes || '-'}</div>
                      <div className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                        {r.updatedAt
                          ? `Last updated: ${new Date(r.updatedAt).toLocaleString()}`
                          : ''}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('supervisor_token'));

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <SupervisorDashboard onLogout={() => setLoggedIn(false)} />;
}

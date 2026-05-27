import React, { useEffect, useState } from 'react';
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

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('delivery1@example.com');
  const [password, setPassword] = useState('Delivery@123');
  const [error, setError] = useState('');
  const companyLogo = useCompanyLogo();

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
      if (data.role !== 'delivery') {
        setError('This portal is only for delivery personnel');
        return;
      }
      localStorage.setItem('delivery_token', data.token);
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
              <div className="app-title">Delivery Portal</div>
              <div className="app-subtitle">Sign in to view your assigned deliveries</div>
            </div>
          </div>
          <div className="app-badge">Delivery</div>
        </div>
        <div className="app-main">
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Sign in</div>
              <span className="chip">Delivery</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

function DeliveryDashboard({ onLogout }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'delivered'
  const [togglingId, setTogglingId] = useState(null);
  const [togglingDeliveredId, setTogglingDeliveredId] = useState(null);
  const [deliveredToById, setDeliveredToById] = useState({});
  const companyLogo = useCompanyLogo();
  const token = localStorage.getItem('delivery_token');

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

  const headers = { Authorization: `Bearer ${token}` };

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests`, { headers });
      if (res.status === 401) {
        localStorage.removeItem('delivery_token');
        window.location.reload();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to load requests');
        return;
      }
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRequests();
      loadAttendanceToday();
    }
  }, []);

  const togglePickedUp = async (requestId) => {
    setTogglingId(requestId);
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests/${requestId}/toggle-picked-up`, {
        method: 'PATCH',
        headers
      });
      const data = await res.json();
      if (!res.ok) {
        notification.error({
          message: 'Error',
          description: data.message || 'Failed to update picked up status',
          placement: 'topRight',
          duration: 4
        });
        return;
      }
      setRequests((prev) => prev.map((r) => (r._id === requestId ? data : r)));
    } catch {
      notification.error({
        message: 'Error',
        description: 'Network error',
        placement: 'topRight',
        duration: 4
      });
    } finally {
      setTogglingId(null);
    }
  };

  const toggleDelivered = async (requestId) => {
    setTogglingDeliveredId(requestId);
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests/${requestId}/toggle-delivered`, {
        method: 'PATCH',
        headers
      });
      const data = await res.json();
      if (!res.ok) {
        notification.error({
          message: 'Error',
          description: data.message || 'Failed to update delivered status',
          placement: 'topRight',
          duration: 4
        });
        return;
      }
      setRequests((prev) => prev.map((r) => (r._id === requestId ? data : r)));
    } catch {
      notification.error({
        message: 'Error',
        description: 'Network error',
        placement: 'topRight',
        duration: 4
      });
    } finally {
      setTogglingDeliveredId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'Dispatched' || r.status === 'Delivered');

  const saveDeliveredTo = async (requestId) => {
    const value = deliveredToById[requestId] ?? requests.find((r) => r._id === requestId)?.deliveredTo ?? '';
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests/${requestId}/delivered-to`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveredTo: value })
      });
      const data = await res.json();
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r._id === requestId ? { ...r, deliveredTo: value } : r))
        );
        notification.success({
          message: 'Saved',
          description: `Delivered to "${value}" recorded.`,
          placement: 'topRight',
          duration: 3
        });
      } else {
        notification.error({
          message: 'Error',
          description: data.message || 'Failed to save name',
          placement: 'topRight',
          duration: 4
        });
      }
    } catch {
      notification.error({
        message: 'Error',
        description: 'Network error while saving name',
        placement: 'topRight',
        duration: 4
      });
    }
  };
  const deliveredRequests = requests.filter((r) => r.status === 'Delivered');

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
              <div className="app-title">Delivery Portal</div>
              <div className="app-subtitle">View and confirm your assigned deliveries</div>
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
                localStorage.removeItem('delivery_token');
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
              className={'tab-button' + (activeTab === 'pending' ? ' active' : '')}
              onClick={() => setActiveTab('pending')}
            >
              Pending Deliveries
              {pendingRequests.length > 0 && (
                <span className="tab-badge">{pendingRequests.length}</span>
              )}
            </button>
            <button
              type="button"
              className={'tab-button' + (activeTab === 'delivered' ? ' active' : '')}
              onClick={() => setActiveTab('delivered')}
            >
              Delivered
            </button>
          </div>

          {error && <p className="text-danger">{error}</p>}
          {loading && <p className="text-muted">Loading...</p>}

          {activeTab === 'pending' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">Pending Deliveries</div>
                <span className="chip">{pendingRequests.length} assigned</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Tenant</th>
                      <th>Building</th>
                      <th>Flat / Block</th>
                      <th>Requested By</th>
                      <th>Assigned On</th>
                      <th>Picked Up</th>
                      <th>Picked Up At</th>
                      <th>Delivered</th>
                      <th>Delivered At</th>
                      <th>Delivered To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.length === 0 && (
                      <tr>
                        <td colSpan="13" className="muted-cell">
                          No pending deliveries at the moment.
                        </td>
                      </tr>
                    )}
                    {pendingRequests.map((req) => (
                      <tr key={req._id}>
                        <td>{req.category}</td>
                        <td>{req.item}</td>
                        <td>{req.quantity}</td>
                        <td>{req.tenant?.name || '-'}</td>
                        <td>{req.buildingName || '-'}</td>
                        <td>
                          {req.tenantFlatNumber
                            ? `Flat ${req.tenantFlatNumber}${req.tenantBlock ? `, Block ${req.tenantBlock}` : ''}`
                            : '-'}
                        </td>
                        <td>{req.requestedBy?.name || '-'}</td>
                        <td>
                          {req.assignedAt
                            ? new Date(req.assignedAt).toLocaleDateString()
                            : '-'}
                        </td>
                        <td>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={!!req.pickedUp}
                              disabled={togglingId === req._id}
                              onChange={() => togglePickedUp(req._id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span>{req.pickedUp ? 'Yes' : 'No'}</span>
                          </label>
                        </td>
                        <td>
                          {req.pickedUpAt
                            ? new Date(req.pickedUpAt).toLocaleString()
                            : '-'}
                        </td>
                        <td>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={req.status === 'Delivered'}
                              disabled={togglingDeliveredId === req._id}
                              onChange={() => toggleDelivered(req._id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span>{req.status === 'Delivered' ? 'Yes' : 'No'}</span>
                          </label>
                        </td>
                        <td>
                          {req.deliveredAt
                            ? new Date(req.deliveredAt).toLocaleString()
                            : '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="text"
                              placeholder="Enter name..."
                              value={deliveredToById[req._id] ?? req.deliveredTo ?? ''}
                              onChange={(e) =>
                                setDeliveredToById((prev) => ({ ...prev, [req._id]: e.target.value }))
                              }
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); saveDeliveredTo(req._id); } }}
                              style={{ width: '120px', padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                            />
                            <button
                              type="button"
                              title="Save"
                              onClick={() => saveDeliveredTo(req._id)}
                              style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #16a34a', background: '#16a34a', color: '#fff', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                            >
                              Add
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'delivered' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">Delivered Items</div>
                <span className="chip">{deliveredRequests.length} total</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Tenant</th>
                      <th>Building</th>
                      <th>Flat / Block</th>
                      <th>Requested By</th>
                      <th>Delivered On</th>
                      <th>Delivered To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveredRequests.length === 0 && (
                      <tr>
                        <td colSpan="9" className="muted-cell">
                          No delivered items yet.
                        </td>
                      </tr>
                    )}
                    {deliveredRequests.map((req) => (
                      <tr key={req._id}>
                        <td>{req.category}</td>
                        <td>{req.item}</td>
                        <td>{req.quantity}</td>
                        <td>{req.tenant?.name || '-'}</td>
                        <td>{req.buildingName || '-'}</td>
                        <td>
                          {req.tenantFlatNumber
                            ? `Flat ${req.tenantFlatNumber}${req.tenantBlock ? `, Block ${req.tenantBlock}` : ''}`
                            : '-'}
                        </td>
                        <td>{req.requestedBy?.name || '-'}</td>
                        <td>
                          {req.deliveredAt
                            ? new Date(req.deliveredAt).toLocaleDateString()
                            : '-'}
                        </td>
                        <td>{req.deliveredTo || '-'}</td>
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
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('delivery_token'));
  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <DeliveryDashboard onLogout={() => setLoggedIn(false)} />;
}

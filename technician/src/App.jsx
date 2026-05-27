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
  const [email, setEmail] = useState('tech1@example.com');
  const [password, setPassword] = useState('Technician@123');
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
      if (data.role !== 'technician') {
        setError('This portal is only for technicians');
        return;
      }
      localStorage.setItem('technician_token', data.token);
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
                style={{ height: '75px', objectFit: 'contain' }}
              />
            )}
            <div>
              <div className="app-title">Technician Portal</div>
              <div className="app-subtitle">Sign in to work on assigned tickets</div>
            </div>
          </div>
          {/* {buildingName && <div className="header-building-name">{buildingName}</div>} */}
          <div className="app-badge">Field Operations</div>
        </div>
        <div className="app-main">
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Sign in</div>
              <span className="chip">Technician</span>
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

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

function TechnicianDashboard({ onLogout }) {
  const [requests, setRequests] = useState([]);
  const [raisedRequests, setRaisedRequests] = useState([]);
  const [statusById, setStatusById] = useState({});
  const [commentById, setCommentById] = useState({});
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [drawerRequestId, setDrawerRequestId] = useState(null);
  const [editingDrawerCommentId, setEditingDrawerCommentId] = useState(null);
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState(null);
  const [uploadingCompletionId, setUploadingCompletionId] = useState(null);
  const [completionUploadError, setCompletionUploadError] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'stocks' | 'raised'
  const [raisedError, setRaisedError] = useState('');
  // Fetch stock requests raised by this technician
  const fetchRaisedRequests = async () => {
    setRaisedError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('technician_token');
        window.location.reload();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setRaisedError(data.message || 'Failed to load raised requests');
        return;
      }
      setRaisedRequests(Array.isArray(data) ? data : []);
    } catch {
      setRaisedError('Network error');
    }
  };
  const [stockEntries, setStockEntries] = useState([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [stocksError, setStocksError] = useState('');
  const [tenantUsers, setTenantUsers] = useState([]);
  const [stockRequestEntry, setStockRequestEntry] = useState(null);
  const [stockRequestTenantId, setStockRequestTenantId] = useState('');
  const [stockRequestQuantity, setStockRequestQuantity] = useState('');
  const [stockRequestComments, setStockRequestComments] = useState('');
  const [stockRequestSubmitting, setStockRequestSubmitting] = useState(false);
  const [stockRequestError, setStockRequestError] = useState('');
  const [stockRequestSuccess, setStockRequestSuccess] = useState('');

  const COMMENT_OPTIONS = [
    'Fixed the issue',
    'Issue not found',
    'Waiting for the item',
    'Waiting for spare parts',
    'Customer not available',
    'Need access to flat',
    'Need to reschedule visit',
    'Requires supervisor approval'
  ];

  const companyLogo = useCompanyLogo();
  const buildingName = useBuildingName();
  const token = localStorage.getItem('technician_token');
  const currentUser = parseJwt(token);

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

  const fetchMyJobs = async () => {
    setError('');
    setInfoMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/requests/technician/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to load jobs');
        return;
      }
      setRequests(data);
    } catch {
      setError('Network error');
    }
  };

  const fetchStockEntries = async () => {
    setStocksError('');
    setStocksLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stocks/entries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setStocksError(data.message || 'Failed to load stock entries');
        return;
      }
      setStockEntries(Array.isArray(data) ? data : []);
    } catch {
      setStocksError('Network error while loading stock entries');
    } finally {
      setStocksLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stocks/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        return;
      }
      setTenantUsers(Array.isArray(data) ? data : []);
    } catch {
      // keep tenant picker empty on failure
    }
  };

  useEffect(() => {
    if (token) {
      fetchMyJobs();
      fetchStockEntries();
      fetchTenants();
      fetchRaisedRequests();
      loadAttendanceToday();
    }
  }, []);

  const openStockRequestDrawer = (entry) => {
    setStockRequestEntry(entry);
    setStockRequestTenantId('');
    setStockRequestQuantity('');
    setStockRequestComments('');
    setStockRequestError('');
    setStockRequestSuccess('');
  };

  const closeStockRequestDrawer = () => {
    setStockRequestEntry(null);
    setStockRequestTenantId('');
    setStockRequestQuantity('');
    setStockRequestComments('');
    setStockRequestError('');
    setStockRequestSuccess('');
  };

  const submitStockRequest = async () => {
    setStockRequestError('');
    setStockRequestSuccess('');

    if (!stockRequestEntry?._id) {
      setStockRequestError('Invalid stock item selected.');
      return;
    }
    if (!stockRequestTenantId) {
      setStockRequestError('Please select a tenant.');
      return;
    }

    const qty = Number(stockRequestQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setStockRequestError('Please enter quantity greater than 0.');
      return;
    }

    setStockRequestSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stockId: stockRequestEntry._id,
          quantity: qty,
          tenantId: stockRequestTenantId,
          comments: stockRequestComments
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setStockRequestError(data.message || 'Failed to submit stock request');
        return;
      }

      notification.success({
        message: 'Stock Request Submitted',
        description: 'Stock request submitted successfully!',
        placement: 'topRight',
        duration: 3
      });
      setStockRequestSuccess('');
      setTimeout(() => {
        closeStockRequestDrawer();
      }, 700);
    } catch {
      setStockRequestError('Network error while submitting stock request');
    } finally {
      setStockRequestSubmitting(false);
    }
  };

  const updateStatus = async (id) => {
    setError('');
    setInfoMessage('');
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
      await fetchMyJobs();
      notification.success({
        message: 'Status Updated',
        description: 'Status and comment saved successfully!',
        placement: 'topRight',
        duration: 3
      });
      setInfoMessage('');
      setEditingStatusId(null);
    } catch {
      setError('Network error');
    }
  };

  const uploadInvoice = async (id, file) => {
    if (!file) return;
    setError('');
    setUploadingInvoiceId(id);
    try {
      const formData = new FormData();
      formData.append('invoice', file);

      const res = await fetch(`${API_BASE}/api/requests/${id}/invoice`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to upload invoice');
        return;
      }
      await fetchMyJobs();
    } catch {
      setError('Network error');
    } finally {
      setUploadingInvoiceId(null);
    }
  };

  const uploadCompletionMedia = async (id, files) => {
    if (!files || files.length === 0) return;
    setCompletionUploadError('');
    setUploadingCompletionId(id);
    try {
      const formData = new FormData();
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          formData.append('images', file);
        } else if (file.type.startsWith('video/')) {
          formData.append('video', file);
        }
      }
      const res = await fetch(`${API_BASE}/api/requests/${id}/completion-media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        setCompletionUploadError(data.message || 'Upload failed');
        return;
      }
      await fetchMyJobs();
      notification.success({
        message: 'Uploaded',
        description: 'Fix proof uploaded successfully!',
        placement: 'topRight',
        duration: 3
      });
    } catch {
      setCompletionUploadError('Network error');
    } finally {
      setUploadingCompletionId(null);
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
              <div className="app-title">Technician Portal</div>
              <div className="app-subtitle">Work through your assigned tickets</div>
            </div>
          </div>
          {/* {buildingName && <div className="header-building-name">{buildingName}</div>} */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            {currentUser.name && (
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{currentUser.name}</span>
            )}
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
                  localStorage.removeItem('technician_token');
                  onLogout();
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="app-main">
          <div className="tabs-row">
            <button
              type="button"
              className={"tab-button" + (activeTab === 'tickets' ? ' active' : '')}
              onClick={() => setActiveTab('tickets')}
            >
              My Tickets
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
              className={"tab-button" + (activeTab === 'raised' ? ' active' : '')}
              onClick={() => setActiveTab('raised')}
            >
              Requests Raised
            </button>
          </div>
          {activeTab === 'raised' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">Requests Raised by Me</div>
                <span className="chip">{raisedRequests.length} items</span>
              </div>
              {raisedError && <p className="text-danger">{raisedError}</p>}
              <div className="stocks-table-wrap">
                <table className="stocks-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Tenant</th>
                      <th>Comments</th>
                      <th>Status</th>
                      <th>Raised On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {raisedRequests.length === 0 && (
                      <tr>
                        <td colSpan="7" className="stocks-empty-row">
                          No requests raised yet.
                        </td>
                      </tr>
                    )}
                    {raisedRequests.map((r) => (
                      <tr key={r._id}>
                        <td>{r.category}</td>
                        <td>{r.item}</td>
                        <td>{r.quantity}</td>
                        <td>
                          {r.tenantFlatNumber
                            ? `Flat ${r.tenantFlatNumber}${r.tenantBlock ? `, Block ${r.tenantBlock}` : ''}`
                            : '-'}
                        </td>
                        <td>{r.comments || '-'}</td>
                        <td>
                          <span
                            className={
                              'status-pill ' +
                              `status-${(r.status || '').toLowerCase().replace(/\s+/g, '-')}`
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                        <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">My tickets</div>
                <span className="chip">{requests.length} items</span>
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
                          <span className="ticket-label">Flat</span> {r.flatNumber || '-'}, {r.block ||
                            'No block'}{' '}
                          · <span className="ticket-label">Priority:</span> {r.priority}
                        </div>
                        <div className="ticket-subline">
                          <span className="ticket-label">Type:</span> {r.requestType || '-'} ·{' '}
                          <span className="ticket-label">Category:</span> {r.maintenanceCategory || '-'}
                        </div>

                        {editingStatusId === r._id && (
                          <div style={{ marginTop: '8px' }}>
                            <div className="field" style={{ marginBottom: '6px' }}>
                              <label>Status</label>
                              <select
                                value={statusById[r._id] || r.status}
                                onChange={(e) =>
                                  setStatusById((prev) => ({ ...prev, [r._id]: e.target.value }))
                                }
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Waiting for Parts">Waiting for Parts</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </div>
                            <div className="field" style={{ marginBottom: '6px' }}>
                              <label>Comment</label>
                              <select
                                value={commentById[r._id] || ''}
                                onChange={(e) =>
                                  setCommentById((prev) => ({ ...prev, [r._id]: e.target.value }))
                                }
                              >
                                <option value="">Select comment</option>
                                {COMMENT_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
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
                                Save
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
                        {editingStatusId !== r._id && (
                          <button
                            className="btn-small btn-primary"
                            type="button"
                            onClick={() => setEditingStatusId(r._id)}
                          >
                            Update status
                          </button>
                        )}
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

          {activeTab === 'stocks' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">Stocks</div>
                <span className="chip">Stock list</span>
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
                      <th>Request</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockEntries.length === 0 && !stocksLoading && (
                      <tr>
                        <td colSpan="6" className="stocks-empty-row">
                          No stock entries available.
                        </td>
                      </tr>
                    )}
                    {stockEntries.map((entry) => (
                      <tr key={entry._id || `${entry.category}-${entry.item}`}>
                        <td>{entry.category}</td>
                        <td>{entry.item}</td>
                        <td>{entry.isAvailable ? 'Available' : 'Not Available'}</td>
                        <td>{entry.isAvailable ? entry.quantity : '-'}</td>
                        <td>{entry.updatedOn ? new Date(entry.updatedOn).toLocaleDateString() : '-'}</td>
                        <td>
                          <button
                            className="btn-small btn-view"
                            type="button"
                            onClick={() => openStockRequestDrawer(entry)}
                          >
                            Request
                          </button>
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

      {stockRequestEntry && (
        <div className="drawer-backdrop" onClick={closeStockRequestDrawer}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <div className="drawer-title">Stock Request</div>
                <div className="text-muted">
                  {stockRequestEntry.category} / {stockRequestEntry.item}
                </div>
              </div>
              <button className="btn-small btn-outline" type="button" onClick={closeStockRequestDrawer}>
                Close
              </button>
            </div>
            <div className="drawer-body">
              <div>
                <div className="field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={stockRequestQuantity}
                    onChange={(e) => setStockRequestQuantity(e.target.value)}
                    placeholder="Enter required quantity"
                  />
                </div>
                <div className="field" style={{ marginTop: '10px' }}>
                  <label>Tenant</label>
                  <select
                    value={stockRequestTenantId}
                    onChange={(e) => setStockRequestTenantId(e.target.value)}
                  >
                    <option value="">Select tenant</option>
                    {tenantUsers.map((tenant) => (
                      <option key={tenant._id} value={tenant._id}>
                        {tenant.flatNumber
                          ? `Flat ${tenant.flatNumber}${tenant.block ? `, Block ${tenant.block}` : ''}`
                          : 'Flat not available'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginTop: '10px' }}>
                  <label>Comments about damaged product</label>
                  <textarea
                    rows={4}
                    value={stockRequestComments}
                    onChange={(e) => setStockRequestComments(e.target.value)}
                    placeholder="Describe the product damage"
                  />
                </div>
                {stockRequestError && <p className="text-danger">{stockRequestError}</p>}
                {stockRequestSuccess && <p className="text-success">{stockRequestSuccess}</p>}
                <div style={{ marginTop: '10px' }}>
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={submitStockRequest}
                    disabled={stockRequestSubmitting}
                  >
                    {stockRequestSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <button
                      className="btn-small btn-outline"
                      type="button"
                      onClick={() => setDrawerRequestId(null)}
                    >
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
                        <div className="detail-item">
                          <div className="text-muted">Preferred visit</div>
                          <div>{r.preferredVisitSlot || 'Any time'}</div>
                        </div>
                        <div className="detail-item">
                          <div className="text-muted">Mobile</div>
                          <div>{r.mobileNumber || '-'}</div>
                        </div>
                        <div className="detail-item" style={{ flexBasis: '100%' }}>
                          <div className="text-muted">Description</div>
                          <div className="text-muted">{r.description || '-'}</div>
                        </div>
                        {(r.images?.length > 0 || r.video) && (
                          <div className="detail-item" style={{ flexBasis: '100%' }}>
                            <div className="text-muted">Attachments</div>
                            {r.images?.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: r.video ? '8px' : '0' }}>
                                {r.images.map((src, i) => (
                                  <a key={i} href={`${API_BASE}${src}`} target="_blank" rel="noreferrer">
                                    <img src={`${API_BASE}${src}`} alt={`photo ${i + 1}`} style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} />
                                  </a>
                                ))}
                              </div>
                            )}
                            {r.video && (
                              <video src={`${API_BASE}${r.video}`} controls style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '6px', display: 'block' }} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="drawer-section-title">Fix Proof</div>
                      {(r.completionImages?.length > 0 || r.completionVideo) && (
                        <div style={{ marginBottom: '10px' }}>
                          {r.completionImages?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: r.completionVideo ? '8px' : '0' }}>
                              {r.completionImages.map((src, i) => (
                                <a key={i} href={`${API_BASE}${src}`} target="_blank" rel="noreferrer">
                                  <img src={`${API_BASE}${src}`} alt={`fix proof ${i + 1}`} style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} />
                                </a>
                              ))}
                            </div>
                          )}
                          {r.completionVideo && (
                            <video src={`${API_BASE}${r.completionVideo}`} controls style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '6px', display: 'block' }} />
                          )}
                        </div>
                      )}
                      {completionUploadError && drawerRequestId === r._id && (
                        <p className="text-danger">{completionUploadError}</p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <label className="btn-small btn-outline file-upload-button">
                          {uploadingCompletionId === r._id ? 'Uploading...' : 'Upload fix proof'}
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            disabled={uploadingCompletionId === r._id}
                            onChange={(e) => {
                              const files = e.target.files ? Array.from(e.target.files) : [];
                              if (files.length > 0) {
                                uploadCompletionMedia(r._id, files);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <div className="drawer-section-title">Invoice</div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}
                      >
                        {r.invoiceUrl ? (
                          <a href={`${API_BASE}${r.invoiceUrl}`} target="_blank" rel="noreferrer">
                            View invoice
                          </a>
                        ) : (
                          <span className="text-muted">No invoice uploaded</span>
                        )}
                        <label className="btn-small btn-outline file-upload-button">
                          {uploadingInvoiceId === r._id ? 'Uploading...' : 'Upload invoice'}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files && e.target.files[0];
                              if (file) {
                                uploadInvoice(r._id, file);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <div className="drawer-comment-header">
                        <div className="drawer-section-title">Your latest comment</div>
                        {editingDrawerCommentId !== r._id && (
                          <button
                            className="btn-small btn-outline"
                            type="button"
                            onClick={() => {
                              setEditingDrawerCommentId(r._id);
                              setCommentById((prev) => ({
                                ...prev,
                                [r._id]: r.notes || ''
                              }));
                            }}
                          >
                            Add comment
                          </button>
                        )}
                      </div>
                      {editingDrawerCommentId === r._id ? (
                        <>
                          <div className="field" style={{ marginTop: '4px' }}>
                            <label>Update comment</label>
                            <select
                              value={commentById[r._id] || ''}
                              onChange={(e) =>
                                setCommentById((prev) => ({
                                  ...prev,
                                  [r._id]: e.target.value
                                }))
                              }
                            >
                              <option value="">Select comment</option>
                              {COMMENT_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <button
                              className="btn-small btn-primary"
                              type="button"
                              onClick={async () => {
                                await updateStatus(r._id);
                                setEditingDrawerCommentId(null);
                              }}
                            >
                              Save
                            </button>
                            <button
                              className="btn-small btn-outline"
                              type="button"
                              onClick={() => {
                                setEditingDrawerCommentId(null);
                                setCommentById((prev) => ({
                                  ...prev,
                                  [r._id]: r.notes || ''
                                }));
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-muted">{r.notes || '-'}</div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

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
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('technician_token'));

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <TechnicianDashboard onLogout={() => setLoggedIn(false)} />;
}

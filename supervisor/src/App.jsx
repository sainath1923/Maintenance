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
                style={{ height: '75px', objectFit: 'contain' }}
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
  const [viewMediaRequest, setViewMediaRequest] = useState(null);
  const [techDropdownOpen, setTechDropdownOpen] = useState({});

  useEffect(() => {
    const handleClickOutside = () => setTechDropdownOpen({});
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const companyLogo = useCompanyLogo();
  const buildingName = useBuildingName();

  const token = localStorage.getItem('supervisor_token');

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

  const supervisorReviewRequest = async (requestId, action) => {
    setStockRequestsError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests/${requestId}/supervisor-approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) {
        setStockRequestsError(data.message || 'Failed to update request');
        return;
      }
      // Optimistically update the local state so the record stays visible
      setStockRequests((prev) =>
        prev.map((r) =>
          r._id === requestId
            ? { ...r, status: action === 'approve' ? 'SupervisorApproved' : 'SupervisorRejected' }
            : r
        )
      );
      notification.success({
        message: action === 'approve' ? 'Request Approved' : 'Request Rejected',
        description: action === 'approve'
          ? 'Request forwarded to procurement.'
          : 'Request has been rejected.',
        placement: 'topRight',
        duration: 3
      });
    } catch {
      setStockRequestsError('Network error');
    }
  };

  useEffect(() => {
    if (token) {
      fetchAssigned();
      fetchTechnicians();
      fetchStockEntries();
      fetchStockRequests();
      loadAttendanceToday();
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

  // Top apartments by request count with most common category
  const apartmentMap = {};
  requests.forEach((r) => {
    const label = `Flat ${r.flatNumber || '-'}, ${r.block || 'No block'}`;
    if (!apartmentMap[label]) apartmentMap[label] = { count: 0, categories: {} };
    apartmentMap[label].count += 1;
    const cat = r.maintenanceCategory || 'Other';
    apartmentMap[label].categories[cat] = (apartmentMap[label].categories[cat] || 0) + 1;
  });
  const topApartments = Object.entries(apartmentMap)
    .map(([label, data]) => ({
      label,
      count: data.count,
      topCategory: Object.entries(data.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Technician resolution times (completedAt preferred, updatedAt as fallback for older records)
  const techResolutionMap = {};
  requests.forEach((r) => {
    if (r.status === 'Completed' && r.technician && r.createdAt) {
      const resolvedAt = r.completedAt || r.updatedAt;
      if (!resolvedAt) return;
      const techId = r.technician;
      const durationMs = new Date(resolvedAt) - new Date(r.createdAt);
      if (durationMs > 0) {
        if (!techResolutionMap[techId]) techResolutionMap[techId] = [];
        techResolutionMap[techId].push(durationMs);
      }
    }
  });
  const techResolutionRows = Object.entries(techResolutionMap).map(([techId, durations]) => {
    const tech = technicians.find((t) => t._id === techId);
    const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minMs = Math.min(...durations);
    const maxMs = Math.max(...durations);
    const fmtDuration = (ms) => {
      const totalMins = Math.round(ms / 60000);
      if (totalMins < 60) return `${totalMins}m`;
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      if (hrs < 24) return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
      const days = Math.floor(hrs / 24);
      const remHrs = hrs % 24;
      return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`;
    };
    return {
      techId,
      name: tech ? `${tech.name}${tech.technicianType ? ` (${tech.technicianType})` : ''}` : 'Unknown',
      count: durations.length,
      avg: fmtDuration(avgMs),
      min: fmtDuration(minMs),
      max: fmtDuration(maxMs),
      avgMs
    };
  }).sort((a, b) => a.avgMs - b.avgMs);

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
              <div className="app-title">Supervisor Portal</div>
              <div className="app-subtitle">Work through assigned maintenance tasks</div>
            </div>
          </div>
          {/* {buildingName && <div className="header-building-name">{buildingName}</div>} */}
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
                localStorage.removeItem('supervisor_token');
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
              <div className="request-grid">
                {requests.map((r) => {
                  const isOverdueUnassigned = !r.technician && (Date.now() - new Date(r.createdAt)) > 1 * 60 * 1000;
                  return (
                    <div key={r._id} className={`request-card${isOverdueUnassigned ? ' overdue' : ''}`}>
                      <div className="request-card-body">
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
                          <span className="ticket-label">Flat</span> {r.flatNumber || '-'},{' '}
                          {r.block || 'No block'}
                        </div>
                        <div className="ticket-subline">
                          <span className="ticket-label">Type:</span> {r.requestType || '-'} ·{' '}
                          <span className="ticket-label">Category:</span> {r.maintenanceCategory || '-'} ·{' '}
                          <span className="ticket-label">Priority:</span> {r.priority}
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
                      <div className="request-card-actions">
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
                  );
                })}
              </div>
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
              <div className="dashboard-row-50" style={{ marginTop: '16px' }}>
                <div className="dashboard-chart dashboard-half">
                  <div className="section-title">Top apartments by requests</div>
                  {topApartments.length === 0 ? (
                    <div className="text-muted" style={{ fontSize: '12px' }}>No request data yet.</div>
                  ) : (
                    <div className="stocks-table-wrap" style={{ marginTop: '8px' }}>
                      <table className="stocks-table">
                        <thead>
                          <tr>
                            <th>Apartment</th>
                            <th>Requests</th>
                            <th>Top Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topApartments.map((apt) => (
                            <tr key={apt.label}>
                              <td>{apt.label}</td>
                              <td>{apt.count}</td>
                              <td>{apt.topCategory}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="dashboard-chart dashboard-half">
                  <div className="section-title">Technician resolution times</div>
                  {techResolutionRows.length === 0 ? (
                    <div className="text-muted" style={{ fontSize: '12px' }}>
                      No completed requests with resolution data yet.
                    </div>
                  ) : (
                    <div className="stocks-table-wrap" style={{ marginTop: '8px' }}>
                      <table className="stocks-table">
                        <thead>
                          <tr>
                            <th>Technician</th>
                            <th>Completed</th>
                            <th>Avg Time</th>
                            <th>Fastest</th>
                            <th>Slowest</th>
                          </tr>
                        </thead>
                        <tbody>
                          {techResolutionRows.map((row) => (
                            <tr key={row.techId}>
                              <td>{row.name}</td>
                              <td>{row.count}</td>
                              <td><strong>{row.avg}</strong></td>
                              <td style={{ color: '#16a34a' }}>{row.min}</td>
                              <td style={{ color: '#dc2626' }}>{row.max}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
                <span className="chip">{stockRequests.filter((r) => r.status === 'Pending').length} pending</span>
              </div>
              {stockRequestsError && <p className="text-danger">{stockRequestsError}</p>}
              <div className="stocks-table-wrap">
                <table className="stocks-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Item</th>
                      <th>Image/Video</th>
                      <th>Quantity</th>
                      <th>Tenant</th>
                      <th>Requested By</th>
                      <th>Comments</th>
                      <th>Requested On</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockRequests.length === 0 && (
                      <tr>
                        <td colSpan="10" className="stocks-empty-row">
                          No pending item requests.
                        </td>
                      </tr>
                    )}
                    {stockRequests.map((request) => (
                      <tr key={request._id}>
                        <td>{request.category}</td>
                        <td>{request.item}</td>
                        <td>
                          {(request.requestImages?.length > 0 || request.requestVideo) ? (
                            <button
                              className="btn-small btn-outline"
                              type="button"
                              onClick={() => setViewMediaRequest(request)}
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>{request.quantity}</td>
                        <td>
                          {request.tenantFlatNumber
                            ? `Flat ${request.tenantFlatNumber}${request.tenantBlock ? `, Block ${request.tenantBlock}` : ''}`
                            : '-'}
                        </td>
                        <td>{request.requestedBy?.name || '-'}</td>
                        <td>{request.comments || '-'}</td>
                        <td>{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-'}</td>
                        <td>
                          <span className={'status-pill status-' +
                            (request.status === 'SupervisorApproved' ? 'approved'
                              : request.status === 'SupervisorRejected' ? 'rejected'
                              : request.status === 'Delivered' ? 'completed'
                              : request.status === 'Dispatched' ? 'in-progress'
                              : request.status === 'Approved' ? 'approved'
                              : request.status === 'ProcurementRequested' ? 'in-progress'
                              : 'pending')}>
                            {request.status === 'SupervisorApproved' ? 'Approved'
                              : request.status === 'SupervisorRejected' ? 'Rejected'
                              : request.status === 'Delivered' ? 'Delivered'
                              : request.status === 'Dispatched' ? 'Dispatched'
                              : request.status === 'Approved' ? 'Stores Approved'
                              : request.status === 'ProcurementRequested' ? 'Procurement'
                              : 'Pending'}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: '6px' }}>
                          {request.status === 'Pending' && (
                            <>
                              <button
                                className="btn-small btn-primary"
                                type="button"
                                onClick={() => supervisorReviewRequest(request._id, 'approve')}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-small btn-outline"
                                type="button"
                                onClick={() => supervisorReviewRequest(request._id, 'reject')}
                              >
                                Reject
                              </button>
                            </>
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
      {viewMediaRequest && (
        <div
          onClick={() => setViewMediaRequest(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '860px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          >
            {viewMediaRequest.requestImages?.map((src, i) => (
              <img
                key={i}
                src={`${API_BASE}${src}`}
                alt={`photo ${i + 1}`}
                style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '10px', objectFit: 'contain', display: 'block' }}
              />
            ))}
            {viewMediaRequest.requestVideo && (
              <video
                src={`${API_BASE}${viewMediaRequest.requestVideo}`}
                controls
                autoPlay
                style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '10px', display: 'block' }}
              />
            )}
            <button
              type="button"
              onClick={() => setViewMediaRequest(null)}
              style={{
                marginTop: '8px', padding: '8px 28px',
                background: 'rgba(255,255,255,0.15)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px',
                cursor: 'pointer', fontSize: '14px'
              }}
            >
              Close
            </button>
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
                        {(() => {
                          const selectedSkills = Object.entries(skillFilters)
                            .filter(([, val]) => val)
                            .map(([key]) => key);
                          let filtered = technicians;
                          if (selectedSkills.length > 0) {
                            filtered = technicians.filter((t) =>
                              t.technicianType && selectedSkills.some((skill) => {
                                const skillMap = { ac: 'ac technician', electrician: 'electrician', plumber: 'plumber', carpenter: 'carpenter', painter: 'painter', other: 'other' };
                                return t.technicianType.toLowerCase() === skillMap[skill];
                              })
                            );
                          }
                          const selectedTech = technicians.find((t) => t._id === (assignment[r._id] || ''));
                          const isOpen = !!techDropdownOpen[r._id];
                          return (
                            <div style={{ position: 'relative' }}>
                              <div
                                onClick={(e) => { e.stopPropagation(); setTechDropdownOpen((prev) => ({ ...prev, [r._id]: !prev[r._id] })); }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  border: '1px solid var(--border-subtle, #d1d5db)',
                                  borderRadius: '6px', padding: '7px 10px',
                                  cursor: 'pointer', background: '#fff',
                                  fontSize: '14px', userSelect: 'none'
                                }}
                              >
                                {selectedTech ? (
                                  <>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, background: technicianUsage[selectedTech._id] ? '#ef4444' : '#22c55e', display: 'inline-block' }} />
                                    <span>{selectedTech.name} {selectedTech.technicianType ? `(${selectedTech.technicianType})` : ''}{technicianUsage[selectedTech._id] ? ` — ${technicianUsage[selectedTech._id]} job${technicianUsage[selectedTech._id] > 1 ? 's' : ''}` : ''}</span>
                                  </>
                                ) : (
                                  <span style={{ color: '#9ca3af' }}>Select</span>
                                )}
                                <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#6b7280' }}>{isOpen ? '▲' : '▼'}</span>
                              </div>
                              {isOpen && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                                  background: '#fff', border: '1px solid var(--border-subtle, #d1d5db)',
                                  borderRadius: '6px', marginTop: '2px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                  maxHeight: '200px', overflowY: 'auto'
                                }}>
                                  <div
                                    onClick={() => { setAssignment((prev) => ({ ...prev, [r._id]: '' })); setTechDropdownOpen((prev) => ({ ...prev, [r._id]: false })); }}
                                    style={{ padding: '8px 10px', fontSize: '14px', color: '#9ca3af', cursor: 'pointer' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                  >
                                    Select
                                  </div>
                                  {filtered.map((t) => {
                                    const jobCount = technicianUsage[t._id] || 0;
                                    const isOccupied = jobCount > 0;
                                    const busyLabel = isOccupied ? ` — ${jobCount} job${jobCount > 1 ? 's' : ''}` : '';
                                    return (
                                      <div
                                        key={t._id}
                                        onClick={() => { setAssignment((prev) => ({ ...prev, [r._id]: t._id })); setTechDropdownOpen((prev) => ({ ...prev, [r._id]: false })); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', cursor: 'pointer', fontSize: '14px' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, background: isOccupied ? '#ef4444' : '#22c55e', display: 'inline-block' }} />
                                        <span style={{ color: '#111827' }}>
                                          {t.name} {t.technicianType ? `(${t.technicianType})` : ''}{busyLabel}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
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
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('supervisor_token'));

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <SupervisorDashboard onLogout={() => setLoggedIn(false)} />;
}

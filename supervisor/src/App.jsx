import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:5000';

function useCompanyLogo() {
  const [logo, setLogo] = useState('');

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/company-profile`);
        const data = await res.json();
        if (res.ok && data.logoUrl) {
          setLogo(data.logoUrl);
        }
      } catch {
        // ignore logo errors
      }
    };
    loadLogo();
  }, []);

  return logo;
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
    other: false
  });
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [error, setError] = useState('');

  const companyLogo = useCompanyLogo();

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

  useEffect(() => {
    if (token) {
      fetchAssigned();
      fetchTechnicians();
    }
  }, []);

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
      await fetchAssigned();
    } catch (err) {
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
                style={{ height: '36px', objectFit: 'contain' }}
              />
            )}
            <div>
              <div className="app-title">Supervisor Dashboard</div>
              <div className="app-subtitle">Work through assigned maintenance tasks</div>
            </div>
          </div>
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
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Assigned tasks</div>
              <span className="chip">{requests.length} tasks</span>
            </div>
            {error && <p className="text-danger">{error}</p>}
            <ul className="list-scroll">
              {requests.map((r) => (
                <li key={r._id}>
                  <div className="ticket-row">
                    <div className="ticket-main">
                      <div>
                        <strong>{r.title}</strong> <span>— {r.status}</span>
                      </div>
                      <div className="text-muted">
                        Flat {r.flatNumber || '-'}, {r.block || 'No block'}
                      </div>
                      <div className="text-muted">
                        Type: {r.requestType || '-'} · Category: {r.maintenanceCategory || '-'} ·
                        Priority: {r.priority}
                      </div>
                      {r.technician && (
                        <div className="text-muted">
                          Assigned to:{' '}
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
                        className="btn-small btn-outline"
                        type="button"
                        onClick={() => setDrawerRequestId(r._id)}
                      >
                        View
                      </button>
                      <button
                        className="btn-small btn-primary"
                        type="button"
                        onClick={() => setEditingStatusId(r._id)}
                      >
                        Update status
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
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
                          {technicians.map((t) => (
                            <option key={t._id} value={t._id}>
                              {t.name} {t.technicianType ? `(${t.technicianType})` : ''}
                            </option>
                          ))}
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

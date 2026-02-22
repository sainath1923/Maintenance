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
              <div className="app-title">Technician Portal</div>
              <div className="app-subtitle">Sign in to see your assigned jobs</div>
            </div>
          </div>
          <div className="app-badge">On-site Team</div>
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

function TechnicianDashboard({ onLogout }) {
  const [requests, setRequests] = useState([]);
  const [statusById, setStatusById] = useState({});
  const [commentById, setCommentById] = useState({});
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [error, setError] = useState('');

  const companyLogo = useCompanyLogo();

  const token = localStorage.getItem('technician_token');

  const fetchMyJobs = async () => {
    setError('');
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
    } catch (err) {
      setError('Network error');
    }
  };

  useEffect(() => {
    if (token) fetchMyJobs();
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
      await fetchMyJobs();
      setEditingStatusId(null);
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
              <div className="app-title">Technician Dashboard</div>
              <div className="app-subtitle">Work through your assigned tickets</div>
            </div>
          </div>
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

        <div className="app-main">
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">My tickets</div>
              <span className="chip">{requests.length} items</span>
            </div>
            {error && <p className="text-danger">{error}</p>}
            <ul className="list-scroll">
              {requests.map((r) => (
                <li key={r._id}>
                  <div className="job-row-header">
                    <div>
                      <strong>{r.title}</strong> <span>— {r.status}</span>
                    </div>
                    {editingStatusId !== r._id && (
                      <button
                        className="btn-small btn-primary"
                        type="button"
                        onClick={() => setEditingStatusId(r._id)}
                      >
                        Update status
                      </button>
                    )}
                  </div>
                  <div className="app-subtitle">
                    Flat {r.flatNumber || '-'}, {r.block || 'No block'} · Priority {r.priority}
                  </div>
                  <div className="app-subtitle">Type: {r.requestType || '-'} · Category: {r.maintenanceCategory || '-'}</div>
                  {editingStatusId === r._id && (
                    <div style={{ marginTop: '4px' }}>
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
                            setCommentById((prev) => ({ ...prev, [r._id]: e.target.value }))
                          }
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-small btn-primary"
                          type="button"
                          onClick={() => updateStatus(r._id)}
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
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('technician_token'));

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <TechnicianDashboard onLogout={() => setLoggedIn(false)} />;
}

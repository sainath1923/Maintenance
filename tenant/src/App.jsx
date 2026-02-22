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
  const [email, setEmail] = useState('tenant1@example.com');
  const [password, setPassword] = useState('Tenant@123');
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
      if (data.role !== 'tenant') {
        setError('This portal is only for tenants');
        return;
      }
      localStorage.setItem('tenant_token', data.token);
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
              <div className="app-title">Tenant Portal</div>
              <div className="app-subtitle">Login to raise and track maintenance requests</div>
            </div>
          </div>
          <div className="app-badge">Residential Maintenance</div>
        </div>
        <div className="app-main">
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Sign in</div>
              <span className="chip">Tenant</span>
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

function TenantDashboard({ onLogout }) {
  const [requests, setRequests] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Low');
  const [requestType, setRequestType] = useState('maintenance');
  const [maintenanceType, setMaintenanceType] = useState('Plumber');
  const [block, setBlock] = useState('Not applicable');
  const [flatNumber, setFlatNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [preferredTime, setPreferredTime] = useState('Any time');
  const [error, setError] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastSnapshot, setLastSnapshot] = useState(null);

  const companyLogo = useCompanyLogo();

  const token = localStorage.getItem('tenant_token');

  const fetchRequests = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/requests/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to load requests');
        return;
      }
      setRequests(data);

      setLastSnapshot((prevSnapshot) => {
        const nextSnapshot = {};
        let newUpdates = 0;

        data.forEach((r) => {
          nextSnapshot[r._id] = { status: r.status, notes: r.notes };
          const prevState = prevSnapshot ? prevSnapshot[r._id] : null;
          if (
            prevState &&
            (prevState.status !== r.status || prevState.notes !== r.notes)
          ) {
            newUpdates += 1;
          }
        });

        if (prevSnapshot && newUpdates > 0) {
          setNotificationCount((prev) => prev + newUpdates);
        }

        return nextSnapshot;
      });
    } catch (err) {
      setError('Network error');
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchRequests();
    const intervalId = setInterval(fetchRequests, 15000);
    return () => clearInterval(intervalId);
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    // Ensure we always send a title to satisfy backend validation
    const effectiveTitle = requestType === 'maintenance' && !title
      ? `${maintenanceType} maintenance`
      : title;
    try {
      const res = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: effectiveTitle,
          description,
          priority,
          block,
          flatNumber,
          mobileNumber,
          preferredVisitSlot: preferredTime,
          requestType,
          maintenanceCategory: requestType === 'maintenance' ? maintenanceType : null,
          // TODO: wire real apartment and category ids
          apartment: null,
          category: null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to create request');
        return;
      }
      setTitle('');
      setDescription('');
      fetchRequests();
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
              <div className="app-title">Tenant Dashboard</div>
              <div className="app-subtitle">Create new requests and review your history</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn-outline btn-small"
              aria-label="Notifications"
              onClick={() => setNotificationCount(0)}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>
                🔔
              </span>
              {notificationCount > 0 && (
                <span className="chip" style={{ marginLeft: '6px' }}>
                  {notificationCount}
                </span>
              )}
            </button>
            <button
              className="btn-outline btn-small"
              onClick={() => {
                localStorage.removeItem('tenant_token');
                onLogout();
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="app-main">
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Raise maintenance request</div>
              <span className="chip">New</span>
            </div>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Block</label>
                <select value={block} onChange={(e) => setBlock(e.target.value)}>
                  <option value="Not applicable">Not applicable</option>
                  <option value="Block A">Block A</option>
                  <option value="Block B">Block B</option>
                  <option value="Block C">Block C</option>
                </select>
              </div>
              <div className="field">
                <label>Flat number</label>
                <input
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  placeholder="e.g. 304"
                />
              </div>
              <div className="field">
                <label>Mobile number</label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. 0501234567"
                />
              </div>
              <div className="field">
                <label>Type</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="request">Request</option>
                </select>
              </div>
              {requestType === 'maintenance' && (
                <div className="field">
                  <label>Maintenance category</label>
                  <select
                    value={maintenanceType}
                    onChange={(e) => setMaintenanceType(e.target.value)}
                  >
                    <option value="Plumber">Plumber</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Painter">Painter</option>
                    <option value="Cleaner">Cleaner</option>
                    <option value="Electrician">Electrician</option>
                    <option value="AC Technician">AC Technician</option>
                  </select>
                </div>
              )}
              {requestType === 'request' && (
                <div className="field">
                  <label>Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
              )}
              <div className="field" style={{ flex: '1 1 100%' }}>
                <label>{requestType === 'maintenance' ? 'Comments' : 'Description'}</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Emergency</option>
                </select>
              </div>
              <div className="field">
                <label>Preferred time to visit</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                >
                  <option>Any time</option>
                  <option>7am to 1pm</option>
                  <option>1pm to 7pm</option>
                </select>
              </div>
              {error && <p className="text-danger">{error}</p>}
              <div style={{ flex: '1 1 100%', textAlign: 'center' }}>
                <button className="btn-primary" type="submit">
                  Submit request
                </button>
              </div>
            </form>
          </div>

          <div className="card card-requests">
            <div className="card-header-row">
              <div className="card-title">My requests</div>
              <span className="chip">{requests.length} requests</span>
            </div>
            <ul className="list-scroll">
              {requests.map((r) => (
                <li key={r._id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div>
                      <strong>{r.title}</strong> · {r.priority}
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
                  {r.notes && (
                    <div className="app-subtitle">
                      Technician comments: {r.notes}
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
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('tenant_token'));

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <TenantDashboard onLogout={() => setLoggedIn(false)} />;
}

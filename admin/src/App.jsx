import React, { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

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
  const [email, setEmail] = useState('admin1@example.com');
  const [password, setPassword] = useState('Admin@123');
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
      if (data.role !== 'admin') {
        setError('This portal is only for admins');
        return;
      }
      localStorage.setItem('admin_token', data.token);
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
              <div className="app-title">Admin Console</div>
              <div className="app-subtitle">Secure access to properties and user management</div>
            </div>
          </div>
          <div className="app-badge">System Admin</div>
        </div>
        <div className="app-main">
          <div className="card">
            <div className="card-header-row">
              <div className="card-title">Sign in</div>
              <span className="chip">Admin</span>
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

function AdminDashboard({ onLogout }) {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('company'); // 'company' | 'add' | 'team' | 'requests'

  const [companyLogo, setCompanyLogo] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [buildingAddress, setBuildingAddress] = useState('');
  const [buildingUrl, setBuildingUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const token = localStorage.getItem('admin_token');

  const [newUserRole, setNewUserRole] = useState('supervisor');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserTechnicianType, setNewUserTechnicianType] = useState('Plumber');

  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requestPriorityFilter, setRequestPriorityFilter] = useState('all');

  const fetchAllRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load requests');
      setRequests(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load users');
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadCompanyProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/company-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load company profile');
      setCompanyLogo(data.logoUrl || '');
      setCompanyName(data.name || '');
      setBuildingAddress(data.buildingAddress || '');
      setBuildingUrl(data.buildingUrl || '');
      if (data.buildingUrl) {
        setQrUrl(data.buildingUrl);
        setProfileSaved(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const saveCompanyProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/company-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          logoUrl: companyLogo,
          name: companyName,
          buildingAddress,
          buildingUrl
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save company profile');
      setProfileSaved(true);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const toggleActive = async (user) => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/users/${user._id}/active`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !user.isActive })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          role: newUserRole,
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          phone: newUserPhone,
          technicianType: newUserRole === 'technician' ? newUserTechnicianType : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create user');
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserPhone('');
      setNewUserTechnicianType('Plumber');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllRequests();
      fetchUsers();
      loadCompanyProfile();
    }
  }, []);

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
              <div className="app-title">Admin Dashboard</div>
              <div className="app-subtitle">User access and maintenance overview</div>
            </div>
          </div>
          <button
            className="btn-outline btn-small"
            onClick={() => {
              localStorage.removeItem('admin_token');
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
              className={"tab-button" + (activeTab === 'company' ? ' active' : '')}
              onClick={() => setActiveTab('company')}
            >
              Company profile
            </button>
            <button
              type="button"
              className={"tab-button" + (activeTab === 'add' ? ' active' : '')}
              onClick={() => setActiveTab('add')}
            >
              Add access
            </button>
            <button
              type="button"
              className={"tab-button" + (activeTab === 'team' ? ' active' : '')}
              onClick={() => setActiveTab('team')}
            >
              Team
            </button>
            <button
              type="button"
              className={"tab-button" + (activeTab === 'requests' ? ' active' : '')}
              onClick={() => setActiveTab('requests')}
            >
              Requests
            </button>
          </div>

          {activeTab === 'company' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">Company profile</div>
              </div>
              <>
                  <form className="two-column-form" onSubmit={(e) => e.preventDefault()}>
                    <div className="field">
                      <label>Company logo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files && e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                              setCompanyLogo(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>
                    <div className="field">
                      <label>Company name</label>
                      <input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Company name"
                      />
                    </div>
                    <div className="field">
                      <label>Building address</label>
                      <input
                        value={buildingAddress}
                        onChange={(e) => setBuildingAddress(e.target.value)}
                        placeholder="Building address"
                      />
                    </div>
                    <div className="field">
                      <label>Building address URL (Google Maps)</label>
                      <input
                        value={buildingUrl}
                        onChange={(e) => setBuildingUrl(e.target.value)}
                        placeholder="https://maps.google.com/..."
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        if (!buildingUrl.trim()) return;
                        setQrUrl(buildingUrl.trim());
                      }}
                      disabled={!buildingUrl.trim()}
                    >
                      Generate QR code
                    </button>
                  </form>

                  {companyLogo && (
                    <div
                      style={{
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img
                        src={companyLogo}
                        alt="Company logo"
                        style={{ height: '40px', objectFit: 'contain' }}
                      />
                    </div>
                  )}

                  {qrUrl && (
                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                      <div className="section-title">Scan for building location</div>
                      <div
                        style={{
                          marginTop: '8px',
                          display: 'inline-block',
                          padding: '8px',
                          background: '#f9fafb',
                          borderRadius: '16px',
                          border: '1px solid rgba(148,163,184,0.4)'
                        }}
                      >
                        <QRCodeCanvas value={qrUrl} size={160} includeMargin={true} />
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={!qrUrl}
                          onClick={async () => {
                            try {
                              await saveCompanyProfile();
                            } catch {
                              // error already handled
                            }
                          }}
                        >
                          {profileSaved ? 'Edit' : 'Submit'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
            </div>
          )}

          {activeTab === 'add' && (
            <div className="card">
              {error && <p className="text-danger">{error}</p>}
              <form onSubmit={createUser} className="two-column-form">
                <div className="field">
                  <label>Role</label>
                  <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                    <option value="tenant">Tenant</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="technician">Technician</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {newUserRole === 'technician' && (
                  <div className="field">
                    <label>Technician type</label>
                    <select
                      value={newUserTechnicianType}
                      onChange={(e) => setNewUserTechnicianType(e.target.value)}
                    >
                      <option value="Plumber">Plumber</option>
                      <option value="Electrician">Electrician</option>
                      <option value="Carpenter">Carpenter</option>
                      <option value="Painter">Painter</option>
                      <option value="Cleaner">Cleaner</option>
                      <option value="AC Technician">AC Technician</option>
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>Name</label>
                  <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                  />
                </div>
                <button className="btn-primary" type="submit">
                  Create user
                </button>
              </form>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">Team</div>
                <span className="chip">{users.length} users</span>
              </div>
              {error && <p className="text-danger">{error}</p>}
              <div className="filters-row">
                <div className="field">
                  <label>Role</label>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                  >
                    <option value="all">All roles</option>
                    <option value="tenant">Tenant</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="technician">Technician</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="field">
                  <label>Search</label>
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Name or email"
                  />
                </div>
              </div>
              <ul className="list-scroll">
                {users
                  .filter((u) => userRoleFilter === 'all' || u.role === userRoleFilter)
                  .filter((u) => {
                    const q = userSearch.trim().toLowerCase();
                    if (!q) return true;
                    const name = (u.name || '').toLowerCase();
                    const email = (u.email || '').toLowerCase();
                    return name.includes(q) || email.includes(q);
                  })
                  .map((u) => (
                    <li key={u._id}>
                      <div className="user-row-main">
                        <div>
                          <div>
                            <strong>{u.name}</strong> ({u.email})
                          </div>
                          <div className="text-muted">
                            Role: {u.role}
                            {u.role === 'technician' && u.technicianType
                              ? ` (${u.technicianType})`
                              : ''}
                          </div>
                          <div className="text-muted">
                            Mobile: {u.phone || '-'}
                          </div>
                          <div className="text-muted">
                            Status: {u.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        <div>
                          <button
                            className={
                              'btn-small status-toggle-button ' +
                              (u.isActive ? 'deactivate' : 'activate')
                            }
                            onClick={() => toggleActive(u)}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">All maintenance requests</div>
                <span className="chip">{requests.length} items</span>
              </div>
              <div className="filters-row">
                <div className="field">
                  <label>Status</label>
                  <select
                    value={requestStatusFilter}
                    onChange={(e) => setRequestStatusFilter(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="In progress">In progress</option>
                    <option value="Waiting for parts">Waiting for parts</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select
                    value={requestPriorityFilter}
                    onChange={(e) => setRequestPriorityFilter(e.target.value)}
                  >
                    <option value="all">All priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <ul className="list-scroll">
                {requests
                  .filter(
                    (r) =>
                      requestStatusFilter === 'all' ||
                      (r.status && r.status.toLowerCase() === requestStatusFilter.toLowerCase())
                  )
                  .filter(
                    (r) =>
                      requestPriorityFilter === 'all' ||
                      (r.priority && r.priority.toLowerCase() === requestPriorityFilter.toLowerCase())
                  )
                  .map((r) => (
                  <li key={r._id}>
                    <div className="request-row-header">
                      <strong>{r.title}</strong>
                      <span
                        className={
                          'status-pill ' +
                          ('status-' + (r.status || 'Pending').toLowerCase().replace(/\s+/g, '-'))
                        }
                      >
                        {r.status || 'Pending'}
                      </span>
                    </div>
                    <div className="text-muted">
                      Flat {r.flatNumber || '-'}, {r.block || 'No block'}
                    </div>
                    <div className="text-muted">
                      Type: {r.requestType || '-'} · Category: {r.maintenanceCategory || '-'} ·
                      Priority: {r.priority}
                    </div>
                    <div className="text-muted">
                      Comments: {r.description || '-'}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('admin_token'));

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <AdminDashboard onLogout={() => setLoggedIn(false)} />;
}

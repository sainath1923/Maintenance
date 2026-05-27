import React, { useEffect, useState, useRef } from 'react';
import { notification } from 'antd';
import 'antd/dist/reset.css';
import { QRCodeCanvas } from 'qrcode.react';

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
          // Only add cache-busting for real HTTP URLs, not base64 data URLs
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
              <div className="app-title">Admin Console</div>
              <div className="app-subtitle">Secure access to properties and user management</div>
            </div>
          </div>
          {/* {buildingName && <div className="header-building-name">{buildingName}</div>} */}
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

  const [activeTab, setActiveTab] = useState('company'); // 'company' | 'add' | 'team' | 'requests' | 'dashboard'


  const [companyLogo, setCompanyLogo] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [buildingAddress, setBuildingAddress] = useState('');
  const [buildingUrl, setBuildingUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Fix: define QR code visibility state here
  const [showBuildingQR, setShowBuildingQR] = useState(true);
  const [showMaintenanceQR, setShowMaintenanceQR] = useState(true);

  // Separate refs for each QR code
  const buildingQrRef = useRef(null);
  const maintenanceQrRef = useRef(null);

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

  const headerBuildingName = useBuildingName();

  // Attendance geo-location settings per role
  const ATTENDANCE_ROLES = ['technician', 'supervisor', 'stores', 'procurement', 'delivery'];
  const [attendanceLocations, setAttendanceLocations] = useState({
    technician: { lat: '', lng: '', radius: 50 },
    supervisor: { lat: '', lng: '', radius: 50 },
    stores: { lat: '', lng: '', radius: 50 },
    procurement: { lat: '', lng: '', radius: 50 },
    delivery: { lat: '', lng: '', radius: 50 }
  });
  const [attendanceSaving, setAttendanceSaving] = useState({});
  const [attendanceMsg, setAttendanceMsg] = useState({});
  const [attendanceError, setAttendanceError] = useState({});
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceRoleFilter, setAttendanceRoleFilter] = useState('all');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('');

  const loadAttendanceLocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/locations`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceLocations((prev) => {
          const next = { ...prev };
          for (const role of ATTENDANCE_ROLES) {
            if (data[role]) {
              next[role] = {
                lat: data[role].lat != null ? String(data[role].lat) : '',
                lng: data[role].lng != null ? String(data[role].lng) : '',
                radius: data[role].radius || 50
              };
            }
          }
          return next;
        });
      }
    } catch {
      // ignore
    }
  };

  const saveAttendanceLocation = async (role) => {
    const loc = attendanceLocations[role];
    const lat = parseFloat(loc.lat);
    const lng = parseFloat(loc.lng);
    const radius = parseFloat(loc.radius) || 50;
    if (isNaN(lat) || isNaN(lng)) {
      setAttendanceError((prev) => ({ ...prev, [role]: 'Please enter valid latitude and longitude.' }));
      return;
    }
    setAttendanceSaving((prev) => ({ ...prev, [role]: true }));
    setAttendanceError((prev) => ({ ...prev, [role]: '' }));
    setAttendanceMsg((prev) => ({ ...prev, [role]: '' }));
    try {
      const res = await fetch(`${API_BASE}/api/attendance/locations/${role}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat, lng, radius })
      });
      if (res.ok) {
        setAttendanceMsg((prev) => ({ ...prev, [role]: 'Location saved.' }));
        setTimeout(() => setAttendanceMsg((prev) => ({ ...prev, [role]: '' })), 3000);
      } else {
        const d = await res.json();
        setAttendanceError((prev) => ({ ...prev, [role]: d.message || 'Save failed.' }));
      }
    } catch {
      setAttendanceError((prev) => ({ ...prev, [role]: 'Network error.' }));
    } finally {
      setAttendanceSaving((prev) => ({ ...prev, [role]: false }));
    }
  };

  const detectLocationForRole = (role) => {
    if (!navigator.geolocation) {
      setAttendanceError((prev) => ({ ...prev, [role]: 'Geolocation not supported by this browser.' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAttendanceLocations((prev) => ({
          ...prev,
          [role]: {
            ...prev[role],
            lat: String(pos.coords.latitude),
            lng: String(pos.coords.longitude)
          }
        }));
      },
      () => {
        setAttendanceError((prev) => ({ ...prev, [role]: 'Could not get current location.' }));
      },
      { enableHighAccuracy: true }
    );
  };

  const loadAttendanceRecords = async () => {
    setAttendanceLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceRecords(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setAttendanceLoading(false);
    }
  };

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
      const res = await fetch(`${API_BASE}/api/company-profile?cb=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load company profile');
      setCompanyLogo(data.logoUrl || '');
      setCompanyName(data.name || '');
      setBuildingName(data.buildingName || '');
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
          buildingName,
          buildingAddress,
          buildingUrl
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save company profile');
      setProfileSaved(true);
      notification.success({
        message: 'Profile Saved',
        description: 'Company profile saved successfully!',
        placement: 'topRight',
        duration: 3
      });
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
      notification.success({
        message: 'User Created',
        description: 'New user created successfully!',
        placement: 'topRight',
        duration: 3
      });
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
      loadAttendanceLocations();
    }
  }, []);

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

  const techniciansOnly = users.filter((u) => u.role === 'technician');

  const technicianUsage = requests.reduce((acc, r) => {
    if (r.technician) {
      acc[r.technician] = (acc[r.technician] || 0) + 1;
    }
    return acc;
  }, {});

  const topTechnicians = Object.entries(technicianUsage)
    .map(([id, count]) => {
      const tech = techniciansOnly.find((t) => t._id === id);
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

  const maxPriorityValue = Math.max(1, ...Object.values(priorityCounts));
  const maxStatusValue = Math.max(1, ...Object.values(statusCounts));
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
      const createdKey = `${created.getFullYear()}-${String(
        created.getMonth() + 1
      ).padStart(2, '0')}`;
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

  // Technician resolution times
  const techResolutionMap = {};
  requests.forEach((r) => {
    if (r.status === 'Completed' && r.technician && r.createdAt) {
      const resolvedAt = r.completedAt || r.updatedAt;
      if (!resolvedAt) return;
      const durationMs = new Date(resolvedAt) - new Date(r.createdAt);
      if (durationMs > 0) {
        if (!techResolutionMap[r.technician]) techResolutionMap[r.technician] = [];
        techResolutionMap[r.technician].push(durationMs);
      }
    }
  });
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
  const techResolutionRows = Object.entries(techResolutionMap).map(([techId, durations]) => {
    const tech = techniciansOnly.find((t) => t._id === techId);
    const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minMs = Math.min(...durations);
    const maxMs = Math.max(...durations);
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
              <div className="app-title">Admin Portal</div>
              <div className="app-subtitle">User access and maintenance overview</div>
            </div>
          </div>
          {/* {headerBuildingName && (
            <div className="header-building-name">{headerBuildingName}</div>
          )} */}
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
            <button
              type="button"
              className={"tab-button" + (activeTab === 'dashboard' ? ' active' : '')}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={"tab-button" + (activeTab === 'attendance' ? ' active' : '')}
              onClick={() => { setActiveTab('attendance'); loadAttendanceRecords(); }}
            >
              Attendance
            </button>
          </div>

          {activeTab === 'company' && (
            <div className="card">
              <div className="card-header-row">
                <div className="card-title">Company profile</div>
              </div>
              {(companyName || buildingName || buildingAddress) && (
                <div className="app-subtitle" style={{ marginBottom: '8px' }}>
                  {companyName}
                  {buildingName
                    ? ` · ${buildingName}`
                    : buildingAddress
                    ? ` · ${buildingAddress}`
                    : ''}
                </div>
              )}
              <>
                  <form className="two-column-form" onSubmit={(e) => e.preventDefault()}>
                    <div className="field">
                      <label>Company logo</label>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={!isEditingProfile}
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
                        disabled={!isEditingProfile}
                      />
                    </div>
                    <div className="field">
                      <label>Building name</label>
                      <input
                        value={buildingName}
                        onChange={(e) => setBuildingName(e.target.value)}
                        placeholder="Building name"
                        disabled={!isEditingProfile}
                      />
                    </div>
                    <div className="field">
                      <label>Building address</label>
                      <input
                        value={buildingAddress}
                        onChange={(e) => setBuildingAddress(e.target.value)}
                        placeholder="Building address"
                        disabled={!isEditingProfile}
                      />
                    </div>
                    <div className="field">
                      <label>Building address URL (Google Maps)</label>
                      <input
                        value={buildingUrl}
                        onChange={(e) => setBuildingUrl(e.target.value)}
                        placeholder="https://maps.google.com/..."
                        disabled={!isEditingProfile}
                      />
                    </div>
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={async () => {
                        if (!isEditingProfile) {
                          setIsEditingProfile(true);
                          return;
                        }
                        try {
                          await saveCompanyProfile();
                          await loadCompanyProfile();
                          setIsEditingProfile(false);
                        } catch {
                          // error already handled
                        }
                      }}
                    >
                      {isEditingProfile ? 'Save Profile' : 'Edit Profile'}
                    </button>
                  </div>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        if (!buildingUrl.trim()) return;
                        setShowBuildingQR(true);
                        setShowMaintenanceQR(false);
                      }}
                      disabled={!buildingUrl.trim()}
                    >
                      Show Building QR code
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ marginLeft: '8px' }}
                      onClick={() => {
                        setShowMaintenanceQR(true);
                        setShowBuildingQR(false);
                      }}
                    >
                      Show Maintenance Request QR
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
                        style={{ height: '75px', objectFit: 'contain' }}
                      />
                    </div>
                  )}

              

                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '32px' }}>
                    {showBuildingQR && buildingUrl.trim() && (
                      <div style={{ textAlign: 'center' }}>
                        <div className="section-title">Building location</div>
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
                          <QRCodeCanvas
                            value={buildingUrl.trim()}
                            size={160}
                            includeMargin={true}
                            ref={buildingQrRef}
                          />
                        </div>
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn-outline btn-small"
                            onClick={() => {
                              // The QRCodeCanvas renders a canvas element as its first child
                              const canvas = buildingQrRef.current?.querySelector('canvas') || buildingQrRef.current;
                              if (!canvas) return;
                              const dataUrl = canvas.toDataURL('image/png');
                              const link = document.createElement('a');
                              link.href = dataUrl;
                              link.download = 'building-qr.png';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            Download QR
                          </button>
                        </div>
                      </div>
                    )}
                    {showMaintenanceQR && (
                      <div style={{ textAlign: 'center' }}>
                        <div className="section-title">Maintenance Request</div>
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
                          <QRCodeCanvas
                            value={'https://www.tenant.maintenance.honouredtech.com/'}
                            size={160}
                            includeMargin={true}
                            ref={maintenanceQrRef}
                          />
                        </div>
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn-outline btn-small"
                            onClick={() => {
                              const canvas = maintenanceQrRef.current?.querySelector('canvas') || maintenanceQrRef.current;
                              if (!canvas) return;
                              const dataUrl = canvas.toDataURL('image/png');
                              const link = document.createElement('a');
                              link.href = dataUrl;
                              link.download = 'maintenance-request-qr.png';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            Download QR
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
                    <option value="delivery">Delivery</option>
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
            <div className="card dashboard-card">
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
                    <option value="delivery">Delivery</option>
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
              <div className="dashboard-grid" style={{marginTop:0}}>
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
                    <div key={u._id} className="metric-card" style={{minWidth:220, marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <strong>{u.name}</strong> <span style={{color:'#6b7280',fontSize:'12px'}}>({u.email})</span>
                        </div>
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
                      <div className="text-muted" style={{marginTop:'4px'}}>
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
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="card dashboard-card">
              <div className="card-header-row">
                <div className="card-title">Portfolio overview</div>
                <span className="chip">Live view</span>
              </div>
              {error && <p className="text-danger">{error}</p>}
              <div className="dashboard-grid">
                <div className="dashboard-metrics">
                  <div className="metric-card">
                    <div className="metric-label">Total requests</div>
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
                        stroke="url(#adminLineGradient)"
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
                        <linearGradient id="adminLineGradient" x1="0" y1="0" x2="1" y2="0">
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

          {activeTab === 'requests' && (
            <div className="card dashboard-card">
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
              <div className="requests-grid">
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
                  .map((r) => {
                    // const isOverdueUnassigned = !r.technician && (Date.now() - new Date(r.createdAt)) > 24 * 60 * 60 * 1000;  
                    const isOverdueUnassigned = !r.technician && (Date.now() - new Date(r.createdAt)) > 1 * 60 * 1000;
                    return (
                    <div key={r._id} className="metric-card" style={{...(isOverdueUnassigned ? { backgroundColor: '#fee2e2' } : {})}}>
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
                      <div className="text-muted" style={{padding:'4px 0'}}>
                        Type: {r.requestType || '-'}
                      </div>
                      <div className="text-muted" style={{padding:'4px 0'}}>
                        Category: {r.maintenanceCategory || '-'}
                      </div>
                      <div className="text-muted" style={{padding:'4px 0'}}>
                        Priority: {r.priority}
                      </div>
                      <div className="text-muted">
                        Comments: {r.description || '-'}
                      </div>
                      {(r.images?.length > 0 || r.video) && (
                        <div style={{ marginTop: '8px' }}>
                          {r.images?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: r.video ? '8px' : '0' }}>
                              {r.images.map((src, i) => (
                                <a key={i} href={`${API_BASE}${src}`} target="_blank" rel="noreferrer">
                                  <img src={`${API_BASE}${src}`} alt={`photo ${i + 1}`} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} />
                                </a>
                              ))}
                            </div>
                          )}
                          {r.video && (
                            <video src={`${API_BASE}${r.video}`} controls style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '6px', display: 'block' }} />
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="card dashboard-card">
              <div className="card-header-row">
                <div className="card-title">Attendance geo-locations</div>
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                Set the allowed punch-in/out location for each role. Staff must be within the specified radius to record attendance.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {ATTENDANCE_ROLES.map((role) => {
                const loc = attendanceLocations[role];
                return (
                  <div key={role} style={{ flex: '1 1 180px', minWidth: '180px', padding: '16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.3)' }}>
                    <div style={{ fontWeight: 700, textTransform: 'capitalize', marginBottom: '10px', fontSize: '14px' }}>{role}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="field">
                        <label>Latitude</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 25.2048"
                          value={loc.lat}
                          onChange={(e) => setAttendanceLocations((prev) => ({ ...prev, [role]: { ...prev[role], lat: e.target.value } }))}
                        />
                      </div>
                      <div className="field">
                        <label>Longitude</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 55.2708"
                          value={loc.lng}
                          onChange={(e) => setAttendanceLocations((prev) => ({ ...prev, [role]: { ...prev[role], lng: e.target.value } }))}
                        />
                      </div>
                      <div className="field">
                        <label>Radius (metres)</label>
                        <input
                          type="number"
                          min="10"
                          max="5000"
                          value={loc.radius}
                          onChange={(e) => setAttendanceLocations((prev) => ({ ...prev, [role]: { ...prev[role], radius: e.target.value } }))}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                      <button className="btn-outline btn-small" type="button" onClick={() => detectLocationForRole(role)}>
                        Use current location
                      </button>
                      <button
                        className="btn-primary btn-small"
                        type="button"
                        disabled={attendanceSaving[role]}
                        onClick={() => saveAttendanceLocation(role)}
                      >
                        {attendanceSaving[role] ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                    {attendanceMsg[role] && <p style={{ color: '#16a34a', fontSize: '12px', marginTop: '6px' }}>{attendanceMsg[role]}</p>}
                    {attendanceError[role] && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>{attendanceError[role]}</p>}
                  </div>
                );
              })}
              </div>

              <div style={{ marginTop: '32px' }}>
                <div className="card-header-row" style={{ marginBottom: '12px' }}>
                  <div className="card-title">Attendance records</div>
                  <button className="btn-outline btn-small" type="button" onClick={loadAttendanceRecords} disabled={attendanceLoading}>
                    {attendanceLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>
                <div className="filters-row" style={{ marginBottom: '12px' }}>
                  <div className="field">
                    <label>Role</label>
                    <select value={attendanceRoleFilter} onChange={(e) => setAttendanceRoleFilter(e.target.value)}>
                      <option value="all">All roles</option>
                      {ATTENDANCE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Date</label>
                    <input type="date" value={attendanceDateFilter} onChange={(e) => setAttendanceDateFilter(e.target.value)} />
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Role</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Punch In</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Punch Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords
                        .filter((r) => attendanceRoleFilter === 'all' || r.role === attendanceRoleFilter)
                        .filter((r) => !attendanceDateFilter || r.date === attendanceDateFilter)
                        .map((r) => (
                          <tr key={r._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px 10px' }}>{r.date}</td>
                            <td style={{ padding: '8px 10px' }}>{r.user?.name || '-'}</td>
                            <td style={{ padding: '8px 10px', textTransform: 'capitalize' }}>{r.role}</td>
                            <td style={{ padding: '8px 10px' }}>
                              {r.punchIn ? new Date(r.punchIn).toLocaleTimeString() : <span style={{ color: '#9ca3af' }}>—</span>}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              {r.punchOut ? new Date(r.punchOut).toLocaleTimeString() : <span style={{ color: '#9ca3af' }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      {attendanceRecords.filter((r) => attendanceRoleFilter === 'all' || r.role === attendanceRoleFilter).filter((r) => !attendanceDateFilter || r.date === attendanceDateFilter).length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>No records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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

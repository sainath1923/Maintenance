import React, { useEffect, useState } from 'react';
import { notification } from 'antd';
import 'antd/dist/reset.css';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : '');

const RATING_URL =
  'https://www.google.com/search?q=bhr+properties&oq=bhr+properties&gs_lcrp=EgZjaHJvbWUqBwgAEAAYgAQyBwgAEAAYgAQyBwgBEAAYgAQyCAgCEAAYFhgeMggIAxAAGBYYHjIICAQQABgWGB4yCAgFEAAYFhgeMggIBhAAGBYYHjIICAcQABgWGB4yCAgIEAAYFhgeMg0ICRAAGIYDGIAEGIoF0gEINDc0OWowajeoAgCwAgA&sourceid=chrome&ie=UTF-8#sv=CAwSrwIKBmxjbF9wdhI5CgNwdnESMkNnMHZaeTh4TVdKaWQzZDBkbTVpSWhRS0RtSm9jaUJ3Y205d1pYSjBhV1Z6RUFJWUF3EqwBCgNscWkSpAFDZzVpYUhJZ2NISnZjR1Z5ZEdsbGMwaUsxZk85cTZxQWdBaGFGaEFBRUFFWUFTSU9ZbWh5SUhCeWIzQmxjblJwWlhPU0FSbHlaV0ZzWDJWemRHRjBaVjl5Wlc1MFlXeGZZV2RsYm1ONW1nRWpRMmhhUkZOVmFFNU1Semx1VXpCV1NsUXdSbTVUVlZKRFdqTldSVk5yZUZKRlFVWDZBUVFJQUJBNRISCgN0YnMSC2xyZjohM3NJQUU9EhMKAXESDmJociBwcm9wZXJ0aWVzGhJsb2NhbC1wbGFjZS12aWV3ZXIYCiD82a_kDA';

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
              <div className="app-title">Tenant Portal</div>
              <div className="app-subtitle">Login to raise and track maintenance requests</div>
            </div>
          </div>
          {/* {buildingName && <div className="header-building-name">{buildingName}</div>} */}
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
  const [mediaImages, setMediaImages] = useState([]);
  const [mediaVideo, setMediaVideo] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoPreview, setVideoPreview] = useState(null);
  const imageInputRef = React.useRef(null);
  const videoInputRef = React.useRef(null);
  // Remove local success state, use antd notification instead
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [activeTab, setActiveTab] = useState('raise'); // 'raise' | 'view'
  const [showRatingModal, setShowRatingModal] = useState(false);

  const companyLogo = useCompanyLogo();
  const buildingName = useBuildingName();

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

      // Auto-show rating modal for completed requests (once per session per request)
      const shownIds = JSON.parse(sessionStorage.getItem('rated_requests') || '[]');
      const newlyCompleted = data.filter(
        (r) => r.status === 'Completed' && !shownIds.includes(r._id)
      );
      if (newlyCompleted.length > 0) {
        sessionStorage.setItem(
          'rated_requests',
          JSON.stringify([...shownIds, ...newlyCompleted.map((r) => r._id)])
        );
        setShowRatingModal(true);
      }

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

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setMediaImages(files);
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => { prev.forEach((url) => URL.revokeObjectURL(url)); return previews; });
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setMediaVideo(file);
    setVideoPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return file ? URL.createObjectURL(file) : null; });
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index]);
    const newFiles = mediaImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setMediaImages(newFiles);
    setImagePreviews(newPreviews);
    if (newFiles.length === 0 && imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setMediaVideo(null);
    setVideoPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    const effectiveTitle =
      requestType === 'maintenance' && !title
        ? `${maintenanceType} maintenance`
        : title;
    if (!effectiveTitle.trim()) {
      setError('Title is required');
      return;
    }
    if (!mobileNumber.trim()) {
      setError('Mobile number is required');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('title', effectiveTitle);
      formData.append('description', description);
      formData.append('priority', priority);
      formData.append('block', block);
      formData.append('flatNumber', flatNumber);
      formData.append('mobileNumber', mobileNumber);
      formData.append('preferredVisitSlot', preferredTime);
      formData.append('requestType', requestType);
      if (requestType === 'maintenance') formData.append('maintenanceCategory', maintenanceType);
      mediaImages.forEach((f) => formData.append('images', f));
      if (mediaVideo) formData.append('video', mediaVideo);

      const res = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to create request');
        return;
      }
      setTitle('');
      setDescription('');
      setMediaImages([]);
      setMediaVideo(null);
      setImagePreviews((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; });
      setVideoPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      notification.success({
        message: 'Request Submitted',
        description: 'Your request has been submitted successfully!',
        placement: 'topRight',
        duration: 3
      });
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
                style={{ height: '75px', objectFit: 'contain' }}
              />
            )}
            <div>
              <div className="app-title">Tenant Portal</div>
              <div className="app-subtitle">Create new requests and review your history</div>
            </div>
          </div>
          {/* {buildingName && <div className="header-building-name">{buildingName}</div>} */}
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
          <div className="tabs-row">
            <button
              type="button"
              className={"tab-button" + (activeTab === 'raise' ? ' active' : '')}
              onClick={() => {
                setActiveTab('raise');
                setError('');
              }}
            >
              Raise request
            </button>
            <button
              type="button"
              className={"tab-button" + (activeTab === 'view' ? ' active' : '')}
              onClick={() => {
                setActiveTab('view');
                setError('');
              }}
            >
              View requests
            </button>
          </div>

          {activeTab === 'raise' && (
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
                    <input required value={title} onChange={(e) => setTitle(e.target.value)} />
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

                <div className="field" style={{ flex: '1 1 100%' }}>
                  <label>Photos <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.85em' }}>(optional, up to 5)</span></label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    id="tenant-image-upload"
                  />
                  <label htmlFor="tenant-image-upload" className="btn-outline btn-small" style={{ display: 'inline-block', cursor: 'pointer', marginBottom: '8px' }}>
                    Choose photos
                  </label>
                  {imagePreviews.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {imagePreviews.map((src, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={src} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)' }} />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', lineHeight: '20px', textAlign: 'center', padding: 0 }}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="field" style={{ flex: '1 1 100%' }}>
                  <label>Video <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.85em' }}>(optional)</span></label>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    style={{ display: 'none' }}
                    id="tenant-video-upload"
                  />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label htmlFor="tenant-video-upload" className="btn-outline btn-small" style={{ display: 'inline-block', cursor: 'pointer' }}>
                      Upload / Record video
                    </label>
                    {mediaVideo && (
                      <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>{mediaVideo.name}</span>
                    )}
                  </div>
                  {videoPreview && (
                    <div style={{ marginTop: '8px', position: 'relative', display: 'inline-block' }}>
                      <video src={videoPreview} controls style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }} />
                      <button
                        type="button"
                        onClick={removeVideo}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', lineHeight: '20px', textAlign: 'center', padding: 0 }}
                      >×</button>
                    </div>
                  )}
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
          )}

          {activeTab === 'view' && (
            <div className="card">
              <style>{`
                .requests-grid {
                  display: grid;
                  gap: 16px;
                  grid-template-columns: 1fr;
                }
                @media (min-width: 600px) {
                  .requests-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (min-width: 960px) {
                  .requests-grid { grid-template-columns: repeat(3, 1fr); }
                }
                @media (min-width: 1400px) {
                  .requests-grid { grid-template-columns: repeat(4, 1fr); }
                }
                .request-card {
                  background: var(--bg-surface, #fff);
                  border: 1px solid var(--border-subtle, #e5e7eb);
                  border-radius: 12px;
                  padding: 16px;
                  display: flex;
                  flex-direction: column;
                  gap: 6px;
                }
              `}</style>
              <div className="card-header-row" style={{ marginBottom: '16px' }}>
                <div className="card-title">My requests</div>
                <span className="chip">{requests.length} requests</span>
              </div>
              <div className="requests-grid">
                {requests.map((r) => (
                  <div key={r._id} className="request-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.95rem', flex: 1 }}>{r.title}</strong>
                      <span
                        className={
                          'status-pill ' +
                          `status-${(r.status || '').toLowerCase().replace(/\s+/g, '-')}`
                        }
                        style={{ flexShrink: 0 }}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="app-subtitle" style={{ fontSize: '0.82rem' }}>Priority: {r.priority}</div>
                    {r.createdAt && (
                      <div className="app-subtitle" style={{ fontSize: '0.82rem' }}>
                        Raised: {new Date(r.createdAt).toLocaleString()}
                      </div>
                    )}
                    {r.notes && (
                      <div className="app-subtitle" style={{ fontSize: '0.82rem' }}>
                        Comments: {r.notes}
                      </div>
                    )}
                    {r.status === 'Completed' && (
                      <a
                        href={RATING_URL}
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginTop: '6px', display: 'inline-block', fontSize: '0.82rem', color: '#4285F4', textDecoration: 'none', fontWeight: 600 }}
                      >
                        ⭐ Rate us on Google
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showRatingModal && (
        <div
          onClick={() => setShowRatingModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px',
              padding: '32px 28px', maxWidth: '360px', width: '100%',
              textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: '#111' }}>
              Your request is complete!
            </div>
            <div style={{ color: '#666', marginBottom: '24px', fontSize: '0.9rem', lineHeight: 1.5 }}>
              We hope everything was resolved to your satisfaction. Would you like to rate us on Google?
            </div>
            <a
              href={RATING_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setShowRatingModal(false)}
              style={{
                display: 'block', background: '#4285F4', color: '#fff',
                padding: '12px 20px', borderRadius: '8px', fontWeight: 600,
                textDecoration: 'none', marginBottom: '12px'
              }}
            >
              Rate us on Google ⭐
            </a>
            <button
              type="button"
              onClick={() => setShowRatingModal(false)}
              style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('tenant_token'));

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <TenantDashboard onLogout={() => setLoggedIn(false)} />;
}

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
  const [drawerRequestId, setDrawerRequestId] = useState(null);
  const [editingDrawerCommentId, setEditingDrawerCommentId] = useState(null);
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState(null);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

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

  const token = localStorage.getItem('technician_token');

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
    } catch (err) {
      setError('Network error');
    }
  };

  useEffect(() => {
    if (token) fetchMyJobs();
  }, []);

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
      setInfoMessage('Status and comment saved successfully.');
      setEditingStatusId(null);
    } catch (err) {
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
    } catch (err) {
      setError('Network error');
    } finally {
      setUploadingInvoiceId(null);
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
            {infoMessage && <p className="text-success">{infoMessage}</p>}
            <ul className="list-scroll">
              {requests.map((r) => (
                <li key={r._id}>
                  <div className="job-row-header">
                    <div>
                      <strong>{r.title}</strong>{' '}
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
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-small btn-outline"
                        type="button"
                        onClick={() => setDrawerRequestId(r._id)}
                      >
                        View
                      </button>
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
                          <div className="text-muted">Invoice</div>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
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
                            <label className="btn-small btn-outline file-upload-button">
                              {uploadingInvoiceId === r._id ? 'Uploading…' : 'Upload invoice'}
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
                        <div className="detail-item" style={{ flexBasis: '100%' }}>
                          <div className="text-muted">Description</div>
                          <div className="text-muted">{r.description || '-'}</div>
                        </div>
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
                            Edit
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
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('technician_token'));

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;
  return <TechnicianDashboard onLogout={() => setLoggedIn(false)} />;
}

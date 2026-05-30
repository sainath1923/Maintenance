import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Drawer, notification } from 'antd';
import API_BASE from '../api';
import '../styles/tickets.scss';
import '../styles/drawer.scss';

const COMMENT_OPTIONS = ["Fixed the issue","Issue not found","Waiting for the item","Waiting for spare parts","Customer not available","Need access to flat","Need to reschedule visit","Requires supervisor approval"];
const STATUS_OPTIONS = ["Pending","In Progress","Waiting for Parts","Rejected","Completed"];

function statusClass(status) {
  return 'status-pill status-' + (status || '').toLowerCase().replace(/\s+/g, '-');
}

export default function Tickets({ token }) {
  const [requests, setRequests] = useState([]);
  const [statusById, setStatusById] = useState({});
  const [commentById, setCommentById] = useState({});
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [drawerRequestId, setDrawerRequestId] = useState(null);
  const [editingDrawerCommentId, setEditingDrawerCommentId] = useState(null);
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState(null);
  const [uploadingCompletionId, setUploadingCompletionId] = useState(null);
  const [completionUploadError, setCompletionUploadError] = useState('');
  const [error, setError] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchMyJobs = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/requests/technician/my`, { headers });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to load jobs'); return; }
      setRequests(data);
    } catch { setError('Network error'); }
  };

  useEffect(() => { fetchMyJobs(); }, []);

  const updateStatus = async (id) => {
    setError('');
    const status = statusById[id] || (requests.find((r) => r._id === id)?.status || 'Pending');
    const notes = commentById[id] || '';
    try {
      const res = await fetch(`${API_BASE}/api/requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ status, notes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to update status'); return; }
      await fetchMyJobs();
      notification.success({ message: 'Status updated', placement: 'topRight', duration: 3 });
      setEditingStatusId(null);
    } catch { setError('Network error'); }
  };

  const uploadInvoice = async (id, file) => {
    if (!file) return;
    setUploadingInvoiceId(id);
    try {
      const formData = new FormData();
      formData.append('invoice', file);
      const res = await fetch(`${API_BASE}/api/requests/${id}/invoice`, {
        method: 'POST', headers, body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Upload failed'); return; }
      await fetchMyJobs();
    } catch { setError('Network error'); }
    finally { setUploadingInvoiceId(null); }
  };

  const uploadCompletionMedia = async (id, files) => {
    if (!files || files.length === 0) return;
    setCompletionUploadError('');
    setUploadingCompletionId(id);
    try {
      const formData = new FormData();
      for (const file of files) {
        if (file.type.startsWith('image/')) formData.append('images', file);
        else if (file.type.startsWith('video/')) formData.append('video', file);
      }
      const res = await fetch(`${API_BASE}/api/requests/${id}/completion-media`, {
        method: 'POST', headers, body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setCompletionUploadError(data.message || 'Upload failed'); return; }
      await fetchMyJobs();
      notification.success({ message: 'Fix proof uploaded', placement: 'topRight', duration: 3 });
    } catch { setCompletionUploadError('Network error'); }
    finally { setUploadingCompletionId(null); }
  };

  const drawerRequest = requests.find((x) => x._id === drawerRequestId) || null;

  return (
    <div className="card dashboard-card">
      <div className="card-header-row">
        <div className="card-title">My Tickets</div>
        <span className="chip">{requests.length} items</span>
      </div>
      {error && <p className="text-danger">{error}</p>}

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        {requests.length === 0 && (
          <Col xs={24}><div className="tickets-empty">No tickets assigned yet.</div></Col>
        )}
        {requests.map((r) => (
          <Col key={r._id} xs={24} sm={12} lg={8} xl={6}>
            <div className="metric-card">
              <div className="request-row-header">
                <strong>{r.title}</strong>
                <span className={statusClass(r.status)}>{r.status}</span>
              </div>
              <div className="text-muted">Flat {r.flatNumber || '-'}, {r.block || 'No block'}</div>
              <div className="text-muted request-field">Type: {r.requestType || '-'}</div>
              <div className="text-muted request-field">Category: {r.maintenanceCategory || '-'}</div>
              <div className="text-muted request-field">Priority: {r.priority}</div>

              {editingStatusId === r._id && (
                <div className="ticket-status-form">
                  <div className="field">
                    <label>Status</label>
                    <select
                      value={statusById[r._id] || r.status}
                      onChange={(e) => setStatusById((prev) => ({ ...prev, [r._id]: e.target.value }))}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Comment</label>
                    <select
                      value={commentById[r._id] || ''}
                      onChange={(e) => setCommentById((prev) => ({ ...prev, [r._id]: e.target.value }))}
                    >
                      <option value="">Select comment</option>
                      {COMMENT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="ticket-form-actions">
                    <button className="btn-primary btn-small" onClick={() => updateStatus(r._id)}>Save</button>
                    <button className="btn-outline btn-small" onClick={() => setEditingStatusId(null)}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="ticket-actions">
                {editingStatusId !== r._id && (
                  <button className="btn-primary btn-small" onClick={() => setEditingStatusId(r._id)}>
                    Update status
                  </button>
                )}
                <button className="btn-outline btn-small" onClick={() => setDrawerRequestId(r._id)}>
                  View details
                </button>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <Drawer
        open={!!drawerRequestId}
        onClose={() => { setDrawerRequestId(null); setEditingDrawerCommentId(null); setCompletionUploadError(''); }}
        title={drawerRequest ? drawerRequest.title : 'Ticket details'}
        placement="bottom"
        height="80vh"
        styles={{ body: { padding: 16, background: '#f3f4f6' } }}
      >
        {drawerRequest && (
          <div className="drawer-body">
            <div className="drawer-section">
              <div className="drawer-details-header">
                <div>
                  <div className="drawer-section-title">Details</div>
                  <strong>{drawerRequest.title}</strong>
                </div>
                <span className={statusClass(drawerRequest.status)}>{drawerRequest.status}</span>
              </div>
              <div className="details-row">
                <div className="detail-item">
                  <span className="text-muted">Flat / Block</span>
                  <span>{drawerRequest.flatNumber || '-'} / {drawerRequest.block || 'No block'}</span>
                </div>
                <div className="detail-item">
                  <span className="text-muted">Type</span>
                  <span>{drawerRequest.requestType || '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="text-muted">Category</span>
                  <span>{drawerRequest.maintenanceCategory || '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="text-muted">Priority</span>
                  <span>{drawerRequest.priority}</span>
                </div>
                <div className="detail-item">
                  <span className="text-muted">Preferred visit</span>
                  <span>{drawerRequest.preferredVisitSlot || 'Any time'}</span>
                </div>
                <div className="detail-item">
                  <span className="text-muted">Mobile</span>
                  <span>{drawerRequest.mobileNumber || '-'}</span>
                </div>
                {drawerRequest.description && (
                  <div className="detail-item detail-item--full">
                    <span className="text-muted">Description</span>
                    <span>{drawerRequest.description}</span>
                  </div>
                )}
                {(drawerRequest.images?.length > 0 || drawerRequest.video) && (
                  <div className="detail-item detail-item--full">
                    <span className="text-muted">Attachments</span>
                    <div className="media-row">
                      {drawerRequest.images?.map((src, i) => (
                        <a key={i} href={`${API_BASE}${src}`} target="_blank" rel="noreferrer">
                          <img src={`${API_BASE}${src}`} alt={`photo ${i + 1}`} className="media-thumb" />
                        </a>
                      ))}
                    </div>
                    {drawerRequest.video && (
                      <video src={`${API_BASE}${drawerRequest.video}`} controls className="media-video" />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="drawer-section">
              <div className="drawer-section-title">Fix Proof</div>
              {(drawerRequest.completionImages?.length > 0 || drawerRequest.completionVideo) && (
                <div className="media-row" style={{ marginBottom: 10 }}>
                  {drawerRequest.completionImages?.map((src, i) => (
                    <a key={i} href={`${API_BASE}${src}`} target="_blank" rel="noreferrer">
                      <img src={`${API_BASE}${src}`} alt={`fix proof ${i + 1}`} className="media-thumb" />
                    </a>
                  ))}
                  {drawerRequest.completionVideo && (
                    <video src={`${API_BASE}${drawerRequest.completionVideo}`} controls className="media-video" />
                  )}
                </div>
              )}
              {completionUploadError && <p className="text-danger">{completionUploadError}</p>}
              <label className="file-upload-btn">
                {uploadingCompletionId === drawerRequest._id ? 'Uploading…' : 'Upload fix proof'}
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  disabled={uploadingCompletionId === drawerRequest._id}
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    if (files.length > 0) { uploadCompletionMedia(drawerRequest._id, files); e.target.value = ''; }
                  }}
                />
              </label>
            </div>

            <div className="drawer-section">
              <div className="drawer-section-title">Invoice</div>
              <div className="invoice-row">
                {drawerRequest.invoiceUrl
                  ? <a href={`${API_BASE}${drawerRequest.invoiceUrl}`} target="_blank" rel="noreferrer">View invoice</a>
                  : <span className="text-muted">No invoice uploaded</span>}
                <label className="file-upload-btn">
                  {uploadingInvoiceId === drawerRequest._id ? 'Uploading…' : 'Upload invoice'}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { uploadInvoice(drawerRequest._id, file); e.target.value = ''; }
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="drawer-section">
              <div className="drawer-comment-header">
                <div className="drawer-section-title" style={{ marginBottom: 0 }}>Comment</div>
                {editingDrawerCommentId !== drawerRequest._id && (
                  <button
                    className="btn-outline btn-small"
                    onClick={() => {
                      setEditingDrawerCommentId(drawerRequest._id);
                      setCommentById((prev) => ({ ...prev, [drawerRequest._id]: drawerRequest.notes || '' }));
                    }}
                  >
                    Add / update
                  </button>
                )}
              </div>
              {editingDrawerCommentId === drawerRequest._id ? (
                <>
                  <div className="field" style={{ marginTop: 8 }}>
                    <select
                      value={commentById[drawerRequest._id] || ''}
                      onChange={(e) => setCommentById((prev) => ({ ...prev, [drawerRequest._id]: e.target.value }))}
                    >
                      <option value="">Select comment</option>
                      {COMMENT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="ticket-form-actions">
                    <button className="btn-primary btn-small" onClick={async () => { await updateStatus(drawerRequest._id); setEditingDrawerCommentId(null); }}>Save</button>
                    <button className="btn-outline btn-small" onClick={() => setEditingDrawerCommentId(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <div className="text-muted" style={{ marginTop: 4 }}>{drawerRequest.notes || '-'}</div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

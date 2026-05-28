import React, { useState } from 'react';
import { API_BASE, parseApiResponse } from '../api';
import '../styles/requests.scss';

export default function Requests({
  requests,
  technicians,
  token,
  error,
  onRefresh,
  setDrawerRequestId
}) {
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [statusById, setStatusById] = useState({});
  const [commentById, setCommentById] = useState({});
  const [updateError, setUpdateError] = useState('');

  const updateStatus = async (id) => {
    setUpdateError('');
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
        setUpdateError(data.message || 'Failed to update status');
        return;
      }
      onRefresh();
    } catch {
      setUpdateError('Network error');
    }
  };

  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-title">Assigned tasks</div>
        <span className="chip">{requests.length} tasks</span>
      </div>
      {(error || updateError) && <p className="text-danger">{error || updateError}</p>}
      <div className="request-grid">
        {requests.map((r) => {
          const isOverdueUnassigned =
            !r.technician && Date.now() - new Date(r.createdAt) > 1 * 60 * 1000;
          return (
            <div
              key={r._id}
              className={`request-card${isOverdueUnassigned ? ' overdue' : ''}`}
            >
              <div className="request-card-body">
                <div className="ticket-header-row">
                  <div className="ticket-title">{r.title}</div>
                  <span
                    className={`status-pill status-${(r.status || '')
                      .toLowerCase()
                      .replace(/\s+/g, '-')}`}
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
                  <span className="ticket-label">Category:</span>{' '}
                  {r.maintenanceCategory || '-'} ·{' '}
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
                  <div className="status-edit-row">
                    <div className="field">
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
                    <div className="field">
                      <label>Comment</label>
                      <input
                        value={commentById[r._id] || ''}
                        onChange={(e) =>
                          setCommentById((prev) => ({ ...prev, [r._id]: e.target.value }))
                        }
                      />
                    </div>
                    <div className="status-edit-actions">
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
  );
}

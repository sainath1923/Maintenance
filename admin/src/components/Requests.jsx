import React, { useState, useEffect } from 'react';
import { Row, Col } from 'antd';
import API_BASE from '../api';
import '../styles/requests.scss';

export default function Requests({ token }) {
  const [requests, setRequests] = useState([]);
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requestPriorityFilter, setRequestPriorityFilter] = useState('all');
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchAllRequests();
  }, []);

  const filteredRequests = requests
    .filter(
      (r) =>
        requestStatusFilter === 'all' ||
        (r.status && r.status.toLowerCase() === requestStatusFilter.toLowerCase())
    )
    .filter(
      (r) =>
        requestPriorityFilter === 'all' ||
        (r.priority && r.priority.toLowerCase() === requestPriorityFilter.toLowerCase())
    );

  return (
    <div className="card dashboard-card">
      <div className="card-header-row">
        <div className="card-title">All maintenance requests</div>
        <span className="chip">{requests.length} items</span>
      </div>
      {error && <p className="text-danger">{error}</p>}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12}>
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
        </Col>
        <Col xs={24} sm={12}>
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
        </Col>
      </Row>
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        {filteredRequests.map((r) => {
          const isOverdueUnassigned =
            !r.technician && Date.now() - new Date(r.createdAt) > 1 * 60 * 1000;
          return (
            <Col key={r._id} xs={24} sm={12} lg={8} xl={6}>
            <div
              className={`metric-card${isOverdueUnassigned ? ' metric-card--overdue' : ''}`}
            >
              <div className="request-row-header">
                <strong>{r.title}</strong>
                <span
                  className={
                    'status-pill ' +
                    'status-' + (r.status || 'Pending').toLowerCase().replace(/\s+/g, '-')
                  }
                >
                  {r.status || 'Pending'}
                </span>
              </div>
              <div className="text-muted">
                Flat {r.flatNumber || '-'}, {r.block || 'No block'}
              </div>
              <div className="text-muted request-field">
                Type: {r.requestType || '-'}
              </div>
              <div className="text-muted request-field">
                Category: {r.maintenanceCategory || '-'}
              </div>
              <div className="text-muted request-field">
                Priority: {r.priority}
              </div>
              <div className="text-muted">Comments: {r.description || '-'}</div>
              {(r.images?.length > 0 || r.video) && (
                <div className="request-media">
                  {r.images?.length > 0 && (
                    <div className={`request-images${r.video ? ' request-images--has-video' : ''}`}>
                      {r.images.map((src, i) => (
                        <a key={i} href={`${API_BASE}${src}`} target="_blank" rel="noreferrer">
                          <img
                            src={`${API_BASE}${src}`}
                            alt={`photo ${i + 1}`}
                            className="request-thumb"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {r.video && (
                    <video
                      src={`${API_BASE}${r.video}`}
                      controls
                      className="request-video"
                    />
                  )}
                </div>
              )}
            </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}

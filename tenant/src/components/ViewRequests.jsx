import React from 'react';
import { Row, Col } from 'antd';
import '../styles/view-requests.scss';

export default function ViewRequests({ requests, ratingUrl }) {
  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-title">My requests</div>
        <span className="chip">{requests.length} requests</span>
      </div>
      <Row gutter={[12, 12]}>
        {requests.map((r) => (
          <Col key={r._id} xs={24} sm={12} lg={8} xl={6}>
            <div className="request-card">
              <div className="request-card-header">
                <strong>{r.title}</strong>
                <span
                  className={
                    'status-pill status-' +
                    (r.status || '').toLowerCase().replace(/\s+/g, '-')
                  }
                >
                  {r.status}
                </span>
              </div>
              <div className="request-card-meta">Priority: {r.priority}</div>
              {r.createdAt && (
                <div className="request-card-meta">
                  Raised: {new Date(r.createdAt).toLocaleString()}
                </div>
              )}
              {r.notes && (
                <div className="request-card-meta">Comments: {r.notes}</div>
              )}
              {r.status === 'Completed' && (
                <a
                  href={ratingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rating-link"
                >
                  ⭐ Rate us on Google
                </a>
              )}
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
}

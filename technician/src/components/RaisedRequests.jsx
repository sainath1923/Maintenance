import React, { useState, useEffect, useMemo } from 'react';
import API_BASE from '../api';

function statusClass(status) {
  return 'status-pill status-' + (status || '').toLowerCase().replace(/\s+/g, '-');
}

export default function RaisedRequests({ token }) {
  const [raisedRequests, setRaisedRequests] = useState([]);
  const [raisedError, setRaisedError] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchRaisedRequests = async () => {
    setLoading(true);
    setRaisedError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests`, { headers });
      const data = await res.json();
      if (!res.ok) { setRaisedError(data.message || 'Failed to load'); return; }
      setRaisedRequests(data);
    } catch { setRaisedError('Network error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRaisedRequests(); }, []);

  return (
    <div className="card dashboard-card">
      <div className="card-header-row">
        <div className="card-title">Requests Raised</div>
        <span className="chip">{raisedRequests.length} items</span>
      </div>
      {raisedError && <p className="text-danger">{raisedError}</p>}
      <div className="stocks-table-wrap">
        <table className="stocks-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Tenant</th>
              <th>Comments</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="stocks-empty-row">Loading…</td></tr>
            )}
            {!loading && raisedRequests.length === 0 && (
              <tr><td colSpan={5} className="stocks-empty-row">No requests raised yet.</td></tr>
            )}
            {raisedRequests.map((req) => (
              <tr key={req._id}>
                <td>{req.stockEntry?.itemName || '-'}</td>
                <td>{req.quantity}</td>
                <td>{req.tenant ? `${req.tenant.name} (${req.tenant.flatNumber})` : '-'}</td>
                <td>{req.comments || '-'}</td>
                <td><span className={statusClass(req.status)}>{req.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

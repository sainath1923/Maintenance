import React, { useState, useEffect, useMemo } from 'react';
import { notification } from 'antd';
import API_BASE from '../api';
import '../styles/requests.scss';

const STATUS_FILTER = ['SupervisorApproved', 'ProcurementRequested', 'Approved'];

function statusLabel(status) {
  if (status === 'SupervisorApproved') return 'New';
  if (status === 'ProcurementRequested') return 'Pending';
  if (status === 'Approved') return 'Approved';
  return status;
}

export default function ItemRequests({ token }) {
  const [stockRequests, setStockRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests`, { headers });
      if (res.status === 401) {
        localStorage.removeItem('procurement_token');
        window.location.reload();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load requests');
      setStockRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const forwardToStores = async (requestId) => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests/${requestId}/procurement-forward`, {
        method: 'PATCH',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to forward request');
        return;
      }
      notification.success({
        message: 'Forwarded to Stores',
        description: 'Request has been forwarded to stores for fulfilment.',
        placement: 'topRight',
        duration: 3,
      });
      await fetchRequests();
    } catch {
      setError('Network error while forwarding request');
    }
  };

  const filtered = stockRequests.filter((r) => STATUS_FILTER.includes(r.status));

  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-title">Item Requests</div>
        <span className="chip">{filtered.length} requests</span>
      </div>
      {error && <p className="text-danger">{error}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Tenant</th>
              <th>Requested By</th>
              <th>Requested On</th>
              <th>Comments</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="muted-cell">No item requests yet.</td>
              </tr>
            )}
            {filtered.map((request) => {
              const label = statusLabel(request.status);
              return (
                <tr key={request._id}>
                  <td>{request.category}</td>
                  <td>{request.item}</td>
                  <td>{request.quantity}</td>
                  <td>
                    {request.tenantFlatNumber
                      ? `Flat ${request.tenantFlatNumber}${request.tenantBlock ? `, Block ${request.tenantBlock}` : ''}`
                      : '-'}
                  </td>
                  <td>{request.requestedBy?.name || '-'}</td>
                  <td>{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-'}</td>
                  <td>{request.comments || '-'}</td>
                  <td>
                    <span className={`status-pill status-${label.toLowerCase()}`}>{label}</span>
                  </td>
                  <td>
                    {request.status === 'SupervisorApproved' && (
                      <button
                        className="btn-small btn-primary"
                        type="button"
                        onClick={() => forwardToStores(request._id)}
                      >
                        Forward to Stores
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

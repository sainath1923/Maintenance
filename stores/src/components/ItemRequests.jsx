import { useState, useMemo } from 'react';
import { Modal, notification } from 'antd';
import API_BASE from '../api';
import '../styles/requests.scss';

function statusClass(status) {
  if (status === 'Approved') return 'approved';
  if (status === 'Dispatched') return 'dispatched';
  if (status === 'Delivered') return 'delivered';
  return 'pending';
}

export default function ItemRequests({ token, stockRequests, onRefresh }) {
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [assigningRequestId, setAssigningRequestId] = useState(null);
  const [assigningPersonId, setAssigningPersonId] = useState('');
  const [assignError, setAssignError] = useState('');
  const [error, setError] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const pendingCount = stockRequests.filter((r) => r.status === 'ProcurementRequested').length;

  const fetchDeliveryPersons = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stocks/delivery-persons`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setDeliveryPersons(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  };

  const approveRequest = async (requestId) => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests/${requestId}/approve`, { method: 'PATCH', headers });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to approve request'); return; }
      notification.success({ message: 'Request Approved', placement: 'topRight', duration: 3 });
      onRefresh();
    } catch { setError('Network error while approving request'); }
  };

  const openAssignDelivery = async (requestId) => {
    await fetchDeliveryPersons();
    setAssigningRequestId(requestId);
    setAssigningPersonId('');
    setAssignError('');
  };

  const closeAssignDelivery = () => {
    setAssigningRequestId(null);
    setAssigningPersonId('');
    setAssignError('');
  };

  const submitAssignDelivery = async () => {
    if (!assigningPersonId) { setAssignError('Please select a delivery person.'); return; }
    setAssignError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests/${assigningRequestId}/assign-delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ deliveryPersonId: assigningPersonId }),
      });
      const data = await res.json();
      if (!res.ok) { setAssignError(data.message || 'Failed to assign delivery person'); return; }
      notification.success({ message: 'Delivery Assigned', placement: 'topRight', duration: 3 });
      closeAssignDelivery();
      onRefresh();
    } catch { setAssignError('Network error while assigning delivery person'); }
  };

  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-title">Procurement Item Requests</div>
        <span className="chip">{pendingCount} pending</span>
      </div>
      {error && <div className="text-danger" style={{ marginBottom: 8 }}>{error}</div>}
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
              <th>Approved On</th>
              <th>Delivery Person</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {stockRequests.length === 0 && (
              <tr><td colSpan="11" className="muted-cell">No procurement requests received yet.</td></tr>
            )}
            {stockRequests.map((r) => (
              <tr key={r._id}>
                <td>{r.category}</td>
                <td>{r.item}</td>
                <td>{r.quantity}</td>
                <td>
                  {r.tenantFlatNumber
                    ? `Flat ${r.tenantFlatNumber}${r.tenantBlock ? `, Block ${r.tenantBlock}` : ''}`
                    : '-'}
                </td>
                <td>{r.requestedBy?.name || '-'}</td>
                <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</td>
                <td>{r.comments || '-'}</td>
                <td>
                  <span className={`status-pill status-${statusClass(r.status)}`}>
                    {r.status === 'ProcurementRequested' ? 'Pending' : r.status}
                  </span>
                </td>
                <td>{r.approvedAt ? new Date(r.approvedAt).toLocaleString() : '-'}</td>
                <td>{r.assignedTo ? r.assignedTo.name : '-'}</td>
                <td>
                  {r.status === 'ProcurementRequested' ? (
                    <button className="btn-small btn-primary" type="button" onClick={() => approveRequest(r._id)}>Approve</button>
                  ) : r.status === 'Approved' ? (
                    <button className="btn-small btn-outline" type="button" onClick={() => openAssignDelivery(r._id)}>Assign Delivery</button>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        title="Assign Delivery Person"
        open={Boolean(assigningRequestId)}
        onCancel={closeAssignDelivery}
        footer={null}
        destroyOnClose
      >
        <div className="assign-delivery-panel">
          {deliveryPersons.length === 0 ? (
            <p className="text-muted">No delivery persons available. Please create a delivery user first.</p>
          ) : (
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Select Delivery Person</label>
              <select value={assigningPersonId} onChange={(e) => setAssigningPersonId(e.target.value)}>
                <option value="">-- Select --</option>
                {deliveryPersons.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}{p.phone ? ` (${p.phone})` : ''}</option>
                ))}
              </select>
            </div>
          )}
          {assignError && <p className="text-danger" style={{ fontSize: 12 }}>{assignError}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn-primary btn-small" type="button" onClick={submitAssignDelivery}>Assign</button>
            <button className="btn-outline btn-small" type="button" onClick={closeAssignDelivery}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

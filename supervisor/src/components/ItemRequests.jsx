import React from 'react';
import '../styles/dashboard.scss';

export default function ItemRequests({ stockRequests, stockRequestsError, onApprove, onReject, setViewMediaRequest }) {
  const pendingCount = stockRequests.filter((r) => r.status === 'Pending').length;

  const getStatusClass = (status) => {
    if (status === 'SupervisorApproved' || status === 'Approved') return 'status-approved';
    if (status === 'SupervisorRejected') return 'status-rejected';
    if (status === 'Delivered') return 'status-completed';
    if (status === 'Dispatched' || status === 'ProcurementRequested') return 'status-in-progress';
    return 'status-pending';
  };

  const getStatusLabel = (status) => {
    if (status === 'SupervisorApproved') return 'Approved';
    if (status === 'SupervisorRejected') return 'Rejected';
    if (status === 'Delivered') return 'Delivered';
    if (status === 'Dispatched') return 'Dispatched';
    if (status === 'Approved') return 'Stores Approved';
    if (status === 'ProcurementRequested') return 'Procurement';
    return 'Pending';
  };

  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-title">Technician Item Requests</div>
        <span className="chip">{pendingCount} pending</span>
      </div>
      {stockRequestsError && <p className="text-danger">{stockRequestsError}</p>}
      <div className="stocks-table-wrap">
        <table className="stocks-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Item</th>
              <th>Image/Video</th>
              <th>Quantity</th>
              <th>Tenant</th>
              <th>Requested By</th>
              <th>Comments</th>
              <th>Requested On</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {stockRequests.length === 0 && (
              <tr>
                <td colSpan="10" className="stocks-empty-row">
                  No pending item requests.
                </td>
              </tr>
            )}
            {stockRequests.map((request) => (
              <tr key={request._id}>
                <td>{request.category}</td>
                <td>{request.item}</td>
                <td>
                  {(request.requestImages?.length > 0 || request.requestVideo) ? (
                    <button
                      className="btn-small btn-outline"
                      type="button"
                      onClick={() => setViewMediaRequest(request)}
                    >
                      View
                    </button>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td>{request.quantity}</td>
                <td>
                  {request.tenantFlatNumber
                    ? `Flat ${request.tenantFlatNumber}${request.tenantBlock ? `, Block ${request.tenantBlock}` : ''}`
                    : '-'}
                </td>
                <td>{request.requestedBy?.name || '-'}</td>
                <td>{request.comments || '-'}</td>
                <td>{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-'}</td>
                <td>
                  <span className={`status-pill ${getStatusClass(request.status)}`}>
                    {getStatusLabel(request.status)}
                  </span>
                </td>
                <td>
                  {request.status === 'Pending' && (
                    <div className="table-actions-cell">
                      <button
                        className="btn-small btn-primary"
                        type="button"
                        onClick={() => onApprove(request._id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-small btn-outline"
                        type="button"
                        onClick={() => onReject(request._id)}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

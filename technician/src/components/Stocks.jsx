import React, { useState, useEffect, useMemo } from 'react';
import { Modal, notification } from 'antd';
import API_BASE from '../api';

export default function Stocks({ token }) {
  const [stockEntries, setStockEntries] = useState([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [stocksError, setStocksError] = useState('');
  const [tenantUsers, setTenantUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchStockEntries = async () => {
    setStocksLoading(true);
    setStocksError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/entries`, { headers });
      const data = await res.json();
      if (!res.ok) { setStocksError(data.message || 'Failed to load stock'); return; }
      setStockEntries(data);
    } catch { setStocksError('Network error'); }
    finally { setStocksLoading(false); }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stocks/tenants`, { headers });
      const data = await res.json();
      if (res.ok) setTenantUsers(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchStockEntries(); fetchTenants(); }, []);

  const openModal = (entry) => {
    setSelectedEntry(entry);
    setQuantity('');
    setTenantId('');
    setComments('');
    setRequestError('');
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setSelectedEntry(null); setRequestError(''); };

  const submitStockRequest = async () => {
    if (!selectedEntry) return;
    if (!quantity || Number(quantity) <= 0) { setRequestError('Enter a valid quantity'); return; }
    setSubmitting(true);
    setRequestError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ stockEntryId: selectedEntry._id, quantity: Number(quantity), tenantId: tenantId || undefined, comments }),
      });
      const data = await res.json();
      if (!res.ok) { setRequestError(data.message || 'Request failed'); return; }
      notification.success({ message: 'Stock request submitted', placement: 'topRight', duration: 3 });
      closeModal();
    } catch { setRequestError('Network error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="card dashboard-card">
      <div className="card-header-row">
        <div className="card-title">Available Stock Items</div>
        <span className="chip">{stockEntries.length} items</span>
      </div>
      {stocksError && <p className="text-danger">{stocksError}</p>}
      <div className="stocks-table-wrap">
        <table className="stocks-table">
          <thead>
            <tr>
              <th>Item name</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Available</th>
              <th>Unit</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {stocksLoading && (
              <tr><td colSpan={6} className="stocks-empty-row">Loading…</td></tr>
            )}
            {!stocksLoading && stockEntries.length === 0 && (
              <tr><td colSpan={6} className="stocks-empty-row">No stock entries found.</td></tr>
            )}
            {stockEntries.map((entry) => (
              <tr key={entry._id}>
                <td>{entry.itemName}</td>
                <td>{entry.brand || '-'}</td>
                <td>{entry.category || '-'}</td>
                <td>{entry.totalQuantity}</td>
                <td>{entry.unit || '-'}</td>
                <td>
                  <button className="btn-primary btn-small" onClick={() => openModal(entry)}>
                    Request
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onCancel={closeModal}
        title={`Request: ${selectedEntry?.itemName || ''}`}
        onOk={submitStockRequest}
        okText="Submit request"
        confirmLoading={submitting}
        okButtonProps={{ disabled: submitting }}
      >
        <div className="field">
          <label>Quantity</label>
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div className="field">
          <label>Tenant (optional)</label>
          <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            <option value="">Select tenant</option>
            {tenantUsers.map((t) => (
              <option key={t._id} value={t._id}>{t.name} ({t.flatNumber})</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Comments</label>
          <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Additional notes" />
        </div>
        {requestError && <p className="text-danger">{requestError}</p>}
      </Modal>
    </div>
  );
}

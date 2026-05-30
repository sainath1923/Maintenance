import React, { useState, useMemo, useEffect } from 'react';
import { notification } from 'antd';
import API_BASE from '../api';
import '../styles/stock-items.scss';

const formatCurrency = (v) => Number(v || 0).toFixed(2);

function getStockAge(createdAt) {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function stockAgeLabel(days) {
  if (days === null) return { text: '-', color: '#9ca3af' };
  if (days <= 30) return { text: days + 'd', color: '#16a34a' };
  if (days <= 90) return { text: days + 'd', color: '#d97706' };
  return { text: days + 'd', color: '#dc2626' };
}

export default function StockItems({ token, stockEntries, stockItemsByCategory, onRefresh }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [updatedOn, setUpdatedOn] = useState(new Date().toISOString().slice(0, 10));
  const [editingEntryId, setEditingEntryId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expandedStockIds, setExpandedStockIds] = useState(new Set());
  const [editingBatch, setEditingBatch] = useState(null);
  const [error, setError] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const categoryOptions = useMemo(() => Object.keys(stockItemsByCategory), [stockItemsByCategory]);
  const itemOptions = selectedCategory ? (stockItemsByCategory[selectedCategory] || []) : [];
  const sortedEntries = useMemo(
    () => [...stockEntries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [stockEntries]
  );

  const resetForm = () => {
    setSelectedCategory(''); setSelectedItem(''); setQuantity('');
    setPrice(''); setUpdatedOn(new Date().toISOString().slice(0, 10));
    setEditingEntryId(''); setBatchNumber('');
  };

  const startEditing = (entry) => {
    setError('');
    setEditingEntryId(entry._id || `${entry.category}-${entry.item}`);
    setSelectedCategory(entry.category || '');
    setSelectedItem(entry.item || '');
    setQuantity(String(entry.quantity ?? 0));
    setPrice(String(entry.price ?? 0));
    setUpdatedOn(entry.updatedOn ? new Date(entry.updatedOn).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  };

  const submitStockItem = async () => {
    setError('');
    if (!selectedCategory || !selectedItem || !updatedOn) { setError('Select category, item and update date.'); return; }
    const parsedQty = Number(quantity);
    if (!Number.isFinite(parsedQty) || parsedQty < 0) { setError('Quantity must be a valid non-negative number.'); return; }
    const parsedPrice = Number(price || 0);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) { setError('Price must be a valid non-negative number.'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/stocks/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ category: selectedCategory, item: selectedItem, quantity: parsedQty, price: parsedPrice, updatedOn, batchNumber: batchNumber.trim(), isEdit: Boolean(editingEntryId) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to save stock item'); return; }
      notification.success({ message: editingEntryId ? 'Stock Item Updated' : 'Stock Item Saved', placement: 'topRight', duration: 3 });
      resetForm();
      onRefresh();
    } catch { setError('Network error while saving stock item'); }
  };

  const deleteEntry = async (entry) => {
    if (!window.confirm(`Delete "${entry.item}" (${entry.category})? This cannot be undone.`)) return;
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/entries/${entry._id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to delete stock item'); return; }
      notification.success({ message: 'Stock Item Deleted', placement: 'topRight', duration: 3 });
      onRefresh();
    } catch { setError('Network error while deleting stock item'); }
  };

  const saveBatchEdit = async () => {
    if (!editingBatch) return;
    const { entryId, batchId, batchNumber: bn, quantity: bq, addedOn } = editingBatch;
    const parsedQty = Number(bq);
    if (!Number.isFinite(parsedQty) || parsedQty < 0) { setError('Batch quantity must be valid.'); return; }
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/entries/${entryId}/batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ batchNumber: bn, quantity: parsedQty, addedOn }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to update batch'); return; }
      setEditingBatch(null);
      onRefresh();
    } catch { setError('Network error while updating batch'); }
  };

  const deleteBatch = async (entry, batch) => {
    if (!window.confirm(`Delete batch "${batch.batchNumber || 'Batch'}" (qty: ${batch.quantity})?`)) return;
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/stocks/entries/${entry._id}/batches/${batch._id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to delete batch'); return; }
      notification.success({ message: 'Batch Deleted', placement: 'topRight', duration: 3 });
      onRefresh();
    } catch { setError('Network error while deleting batch'); }
  };

  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-title">Add / Update Stock Items</div>
        <span className="chip">{stockEntries.length} items</span>
      </div>
      {editingEntryId && (
        <div className="edit-banner">
          <span>Editing selected stock item</span>
          <button className="btn-outline btn-small" type="button" onClick={resetForm}>Cancel</button>
        </div>
      )}
      <div className="form-grid">
        <div className="field">
          <label>Category</label>
          <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedItem(''); }} disabled={Boolean(editingEntryId)}>
            <option value="">Select category</option>
            {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Item</label>
          <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} disabled={!selectedCategory || Boolean(editingEntryId)}>
            <option value="">Select item</option>
            {itemOptions.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Quantity</label>
          <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Enter quantity" />
        </div>
        {!editingEntryId && (
          <div className="field">
            <label>Batch / Lot No.</label>
            <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g. INV-2026-001" />
          </div>
        )}
        <div className="field">
          <label>Price</label>
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter amount" />
        </div>
        <div className="field">
          <label>Updated On</label>
          <input type="date" value={updatedOn} onChange={(e) => setUpdatedOn(e.target.value)} />
        </div>
        <div className="field field-submit">
          <label>&nbsp;</label>
          <button className="btn-primary" type="button" onClick={submitStockItem}>
            {editingEntryId ? 'Update' : 'Submit'}
          </button>
        </div>
      </div>
      {error && <div className="text-danger" style={{ marginTop: 8 }}>{error}</div>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Category</th>
              <th>Item</th>
              <th>Total Qty</th>
              <th>Item Price</th>
              <th>Total Price</th>
              <th>Updated On</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.length === 0 && (
              <tr><td colSpan="9" className="muted-cell">No stock items available.</td></tr>
            )}
            {sortedEntries.map((entry) => {
              const isExpanded = expandedStockIds.has(entry._id);
              const batches = [...(entry.batches || [])].sort((a, b) => new Date(a.addedOn) - new Date(b.addedOn));
              const hasBatches = batches.length > 0;
              const effectiveQty = hasBatches
                ? batches.reduce((s, b) => s + (Number(b.quantity) || 0), 0)
                : (entry.quantity ?? 0);
              return (
                <React.Fragment key={entry._id}>
                  <tr>
                    <td style={{ textAlign: 'center' }}>
                      {hasBatches && (
                        <button className="btn-small btn-outline" type="button" style={{ padding: '2px 7px', fontSize: '11px' }}
                          onClick={() => setExpandedStockIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(entry._id)) next.delete(entry._id); else next.add(entry._id);
                            return next;
                          })}>
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      )}
                    </td>
                    <td>{entry.category}</td>
                    <td>{entry.item}</td>
                    <td>{effectiveQty}</td>
                    <td>{formatCurrency(entry.price)}</td>
                    <td>{formatCurrency(effectiveQty * Number(entry.price || 0))}</td>
                    <td>{entry.updatedOn ? new Date(entry.updatedOn).toLocaleDateString() : '-'}</td>
                    <td>{effectiveQty > 0 ? 'Available' : 'Not Available'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-small btn-outline" type="button" onClick={() => startEditing(entry)}>Edit</button>
                        <button className="btn-small btn-outline btn-danger" type="button" onClick={() => deleteEntry(entry)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && batches.map((batch, idx) => {
                    const ageDays = getStockAge(batch.addedOn);
                    const age = stockAgeLabel(ageDays);
                    const isOldest = idx === 0 && batches.length > 1;
                    const isEditingThis = editingBatch && editingBatch.entryId === entry._id && editingBatch.batchId === batch._id;
                    if (isEditingThis) {
                      return (
                        <tr key={batch._id + '-edit'} className="batch-row batch-edit-row">
                          <td></td>
                          <td style={{ paddingLeft: 28, color: '#6b7280' }}>Batch {idx + 1}</td>
                          <td>
                            <input style={{ width: '100%', fontSize: 12, padding: '2px 4px' }}
                              value={editingBatch.batchNumber}
                              onChange={(e) => setEditingBatch((p) => ({ ...p, batchNumber: e.target.value }))}
                              placeholder="Batch / Lot No." />
                          </td>
                          <td>
                            <input type="number" min="0" style={{ width: 70, fontSize: 12, padding: '2px 4px' }}
                              value={editingBatch.quantity}
                              onChange={(e) => setEditingBatch((p) => ({ ...p, quantity: e.target.value }))} />
                          </td>
                          <td>{formatCurrency(entry.price)}</td>
                          <td>{formatCurrency(Number(editingBatch.quantity || 0) * Number(entry.price || 0))}</td>
                          <td>
                            <input type="date" style={{ fontSize: 12, padding: '2px 4px' }}
                              value={editingBatch.addedOn}
                              onChange={(e) => setEditingBatch((p) => ({ ...p, addedOn: e.target.value }))} />
                          </td>
                          <td></td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn-small btn-primary" type="button" onClick={saveBatchEdit}>Save</button>
                              <button className="btn-small btn-outline" type="button" onClick={() => setEditingBatch(null)}>Cancel</button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={batch._id} className="batch-row">
                        <td></td>
                        <td style={{ paddingLeft: 28, color: '#6b7280' }}>Batch {idx + 1}</td>
                        <td>
                          <span className="batch-number-mono">{batch.batchNumber || '—'}</span>
                          {isOldest && <span className="release-first-badge">Release First</span>}
                        </td>
                        <td>{batch.quantity}</td>
                        <td>{formatCurrency(entry.price)}</td>
                        <td>{formatCurrency(batch.quantity * Number(entry.price || 0))}</td>
                        <td>{batch.addedOn ? new Date(batch.addedOn).toLocaleDateString() : '-'}</td>
                        <td><span style={{ fontWeight: 600, color: age.color }}>{age.text}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-small btn-outline" type="button"
                              onClick={() => setEditingBatch({
                                entryId: entry._id, batchId: batch._id,
                                batchNumber: batch.batchNumber || '',
                                quantity: String(batch.quantity),
                                addedOn: batch.addedOn ? new Date(batch.addedOn).toISOString().slice(0, 10) : '',
                              })}>Edit</button>
                            <button className="btn-small btn-outline btn-danger" type="button" onClick={() => deleteBatch(entry, batch)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

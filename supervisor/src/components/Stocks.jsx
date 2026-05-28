import React from 'react';
import '../styles/dashboard.scss';

export default function Stocks({ stockEntries, stocksLoading, stocksError }) {
  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-title">Stocks</div>
        <span className="chip">Stock availability</span>
      </div>
      {stocksError && <p className="text-danger">{stocksError}</p>}
      <div className="stocks-table-wrap">
        <table className="stocks-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Item</th>
              <th>Status</th>
              <th>Quantity</th>
              <th>Updated On</th>
            </tr>
          </thead>
          <tbody>
            {stockEntries.length === 0 && !stocksLoading && (
              <tr>
                <td colSpan="5" className="stocks-empty-row">
                  No stock entries submitted yet.
                </td>
              </tr>
            )}
            {stockEntries.map((entry) => (
              <tr key={entry._id || `${entry.category}-${entry.item}`}>
                <td>{entry.category}</td>
                <td>{entry.item}</td>
                <td>{entry.isAvailable ? 'Available' : 'Not Available'}</td>
                <td>{entry.isAvailable ? entry.quantity : '-'}</td>
                <td>{entry.updatedOn ? new Date(entry.updatedOn).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

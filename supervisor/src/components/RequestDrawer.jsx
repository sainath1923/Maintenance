import React from 'react';
import { notification } from 'antd';
import { API_BASE } from '../api';
import '../styles/drawer.scss';

const SKILL_MAP = {
  ac: 'ac technician',
  electrician: 'electrician',
  plumber: 'plumber',
  carpenter: 'carpenter',
  painter: 'painter',
  other: 'other'
};

export default function RequestDrawer({
  requestId,
  requests,
  technicians,
  technicianUsage,
  assignment,
  setAssignment,
  skillFilters,
  setSkillFilters,
  techDropdownOpen,
  setTechDropdownOpen,
  token,
  onClose,
  onAssigned
}) {
  const r = requests.find((x) => x._id === requestId);
  if (!r) return null;

  const assignTechnician = async () => {
    const technicianId = assignment[r._id];
    if (!technicianId) return;
    try {
      const res = await fetch(`${API_BASE}/api/requests/${r._id}/assign-technician`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ technicianId })
      });
      const data = await res.json();
      if (!res.ok) {
        notification.error({ message: data.message || 'Failed to assign technician' });
        return;
      }
      setAssignment((prev) => ({ ...prev, [r._id]: '' }));
      notification.success({
        message: 'Ticket Assigned',
        description: 'Ticket assigned to technician successfully!',
        placement: 'topRight',
        duration: 3
      });
      onAssigned();
    } catch {
      notification.error({ message: 'Network error' });
    }
  };

  const selectedSkills = Object.entries(skillFilters)
    .filter(([, val]) => val)
    .map(([key]) => key);

  let filtered = technicians;
  if (selectedSkills.length > 0) {
    filtered = technicians.filter(
      (t) =>
        t.technicianType &&
        selectedSkills.some((skill) => t.technicianType.toLowerCase() === SKILL_MAP[skill])
    );
  }

  const selectedTech = technicians.find((t) => t._id === (assignment[r._id] || ''));
  const isOpen = !!techDropdownOpen[r._id];

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div className="drawer-title">Ticket details</div>
            <div className="text-muted">{r._id}</div>
          </div>
          <button className="btn-small btn-outline" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="drawer-body">
          {/* Details section */}
          <div>
            <div className="drawer-details-header">
              <div>
                <div className="drawer-section-title">Details</div>
                <div>{r.title}</div>
              </div>
              <span
                className={`status-pill status-${(r.status || '').toLowerCase().replace(/\s+/g, '-')}`}
              >
                {r.status}
              </span>
            </div>
            <div className="details-row">
              <div className="detail-item">
                <div className="text-muted">Flat / Block</div>
                <div>{r.flatNumber || '-'} / {r.block || 'No block'}</div>
              </div>
              <div className="detail-item">
                <div className="text-muted">Type</div>
                <div>{r.requestType || '-'}</div>
              </div>
              <div className="detail-item">
                <div className="text-muted">Category</div>
                <div>{r.maintenanceCategory || '-'}</div>
              </div>
              <div className="detail-item">
                <div className="text-muted">Priority</div>
                <div>{r.priority}</div>
              </div>
              {r.technician && (
                <div className="detail-item full-width">
                  <div className="text-muted">Technician</div>
                  {(() => {
                    const tech = technicians.find((t) => t._id === r.technician);
                    if (!tech) return <div className="text-muted">-</div>;
                    const phone = tech.phone || '';
                    const label = `${tech.name}${tech.technicianType ? ` (${tech.technicianType})` : ''}`;
                    return (
                      <div className="tech-inline-row">
                        <span>{label}</span>
                        {phone && (
                          <>
                            <span className="text-muted">{phone}</span>
                            <button
                              type="button"
                              className="btn-small btn-outline"
                              onClick={() => {
                                if (navigator.clipboard) {
                                  navigator.clipboard.writeText(phone).catch(() => {});
                                }
                              }}
                            >
                              Copy
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
              <div className="detail-item full-width">
                <div className="text-muted">Invoice</div>
                <div>
                  {r.invoiceUrl ? (
                    <a href={`${API_BASE}${r.invoiceUrl}`} target="_blank" rel="noreferrer">
                      View invoice
                    </a>
                  ) : (
                    <span className="text-muted">No invoice uploaded</span>
                  )}
                </div>
              </div>
              <div className="detail-item">
                <div className="text-muted">Comments</div>
                <div className="text-muted">{r.description || '-'}</div>
              </div>
              {(r.images?.length > 0 || r.video) && (
                <div className="detail-item full-width">
                  <div className="text-muted">Attachments</div>
                  {r.images?.length > 0 && (
                    <div className="attachment-images">
                      {r.images.map((src, i) => (
                        <a key={i} href={`${API_BASE}${src}`} target="_blank" rel="noreferrer">
                          <img src={`${API_BASE}${src}`} alt={`photo ${i + 1}`} />
                        </a>
                      ))}
                    </div>
                  )}
                  {r.video && (
                    <video
                      src={`${API_BASE}${r.video}`}
                      controls
                      className="attachment-video"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Assign section */}
          <div>
            <div className="drawer-section-title">Assign</div>
            <div className="checkbox-group">
              {Object.keys(SKILL_MAP).map((key) => (
                <div className="checkbox-row" key={key}>
                  <input
                    type="checkbox"
                    checked={skillFilters[key]}
                    onChange={(e) =>
                      setSkillFilters((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                  />
                  <span>
                    {key === 'ac' ? 'AC Technician' : key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                </div>
              ))}
            </div>
            <div className="field">
              <label>Select technician</label>
              <div className="tech-dropdown">
                <div
                  className="tech-dropdown-trigger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTechDropdownOpen((prev) => ({ ...prev, [r._id]: !prev[r._id] }));
                  }}
                >
                  {selectedTech ? (
                    <>
                      <span
                        className={`tech-status-dot ${technicianUsage[selectedTech._id] ? 'occupied' : 'free'}`}
                      />
                      <span>
                        {selectedTech.name}
                        {selectedTech.technicianType ? ` (${selectedTech.technicianType})` : ''}
                        {technicianUsage[selectedTech._id]
                          ? ` — ${technicianUsage[selectedTech._id]} job${technicianUsage[selectedTech._id] > 1 ? 's' : ''}`
                          : ''}
                      </span>
                    </>
                  ) : (
                    <span className="tech-dropdown-placeholder">Select</span>
                  )}
                  <span className="tech-dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div
                    className="tech-dropdown-list"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="tech-dropdown-item placeholder"
                      onClick={() => {
                        setAssignment((prev) => ({ ...prev, [r._id]: '' }));
                        setTechDropdownOpen((prev) => ({ ...prev, [r._id]: false }));
                      }}
                    >
                      Select
                    </div>
                    {filtered.map((t) => {
                      const jobCount = technicianUsage[t._id] || 0;
                      const isOccupied = jobCount > 0;
                      const busyLabel = isOccupied
                        ? ` — ${jobCount} job${jobCount > 1 ? 's' : ''}`
                        : '';
                      return (
                        <div
                          key={t._id}
                          className="tech-dropdown-item"
                          onClick={() => {
                            setAssignment((prev) => ({ ...prev, [r._id]: t._id }));
                            setTechDropdownOpen((prev) => ({ ...prev, [r._id]: false }));
                          }}
                        >
                          <span className={`tech-status-dot ${isOccupied ? 'occupied' : 'free'}`} />
                          <span>
                            {t.name}
                            {t.technicianType ? ` (${t.technicianType})` : ''}
                            {busyLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="assign-save-row">
              <button
                className="btn-small btn-primary"
                type="button"
                onClick={() => {
                  if (assignment[r._id]) assignTechnician();
                }}
              >
                Save assignment
              </button>
            </div>
          </div>

          {/* Comments section */}
          <div>
            <div className="drawer-section-title">Technician comments</div>
            <div className="text-muted">{r.notes || '-'}</div>
            {r.updatedAt && (
              <div className="text-muted drawer-comment-date">
                Last updated: {new Date(r.updatedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

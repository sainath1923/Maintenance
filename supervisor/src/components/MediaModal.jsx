import React from 'react';
import { API_BASE } from '../api';
import '../styles/media-modal.scss';

export default function MediaModal({ request, onClose }) {
  if (!request) return null;

  return (
    <div className="media-modal-overlay" onClick={onClose}>
      <div className="media-modal-content" onClick={(e) => e.stopPropagation()}>
        {request.requestImages?.map((src, i) => (
          <img
            key={i}
            src={`${API_BASE}${src}`}
            alt={`photo ${i + 1}`}
            className="media-modal-img"
          />
        ))}
        {request.requestVideo && (
          <video
            src={`${API_BASE}${request.requestVideo}`}
            controls
            autoPlay
            className="media-modal-video"
          />
        )}
        <button type="button" className="media-modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

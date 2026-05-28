import React from 'react';
import { Modal, Button } from 'antd';
import '../styles/rating-modal.scss';

export default function RatingModal({ open, onClose, ratingUrl }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={360}
    >
      <div className="rating-modal-body">
        <div className="rating-modal-star">⭐</div>
        <div className="rating-modal-title">
          Your request is complete!
        </div>
        <div className="rating-modal-desc">
          We hope everything was resolved to your satisfaction. Would you like to rate us on Google?
        </div>
        <a
          href={ratingUrl}
          target="_blank"
          rel="noreferrer"
          onClick={onClose}
          className="rating-modal-cta"
        >
          Rate us on Google ⭐
        </a>
        <Button type="text" onClick={onClose}>
          Maybe later
        </Button>
      </div>
    </Modal>
  );
}

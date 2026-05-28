import React, { useState, useRef } from 'react';
import { notification, Row, Col } from 'antd';
import API_BASE from '../api';
import '../styles/raise-request.scss';

export default function RaiseRequest({ token, onSubmitted }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Low');
  const [requestType, setRequestType] = useState('maintenance');
  const [maintenanceType, setMaintenanceType] = useState('Plumber');
  const [block, setBlock] = useState('Not applicable');
  const [flatNumber, setFlatNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [preferredTime, setPreferredTime] = useState('Any time');
  const [error, setError] = useState('');
  const [mediaImages, setMediaImages] = useState([]);
  const [mediaVideo, setMediaVideo] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoPreview, setVideoPreview] = useState(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setMediaImages(files);
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return previews;
    });
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setMediaVideo(file);
    setVideoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setMediaImages((f) => f.filter((_, i) => i !== index));
    setImagePreviews((p) => {
      const next = p.filter((_, i) => i !== index);
      if (next.length === 0 && imageInputRef.current) imageInputRef.current.value = '';
      return next;
    });
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setMediaVideo(null);
    setVideoPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    const effectiveTitle =
      requestType === 'maintenance' && !title
        ? `${maintenanceType} maintenance`
        : title;
    if (!effectiveTitle.trim()) {
      setError('Title is required');
      return;
    }
    if (!mobileNumber.trim()) {
      setError('Mobile number is required');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('title', effectiveTitle);
      formData.append('description', description);
      formData.append('priority', priority);
      formData.append('block', block);
      formData.append('flatNumber', flatNumber);
      formData.append('mobileNumber', mobileNumber);
      formData.append('preferredVisitSlot', preferredTime);
      formData.append('requestType', requestType);
      if (requestType === 'maintenance') formData.append('maintenanceCategory', maintenanceType);
      mediaImages.forEach((f) => formData.append('images', f));
      if (mediaVideo) formData.append('video', mediaVideo);

      const res = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to create request');
        return;
      }

      setTitle('');
      setDescription('');
      setMediaImages([]);
      setMediaVideo(null);
      setImagePreviews((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; });
      setVideoPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';

      notification.success({
        message: 'Request Submitted',
        description: 'Your request has been submitted successfully!',
        placement: 'topRight',
        duration: 3
      });
      if (onSubmitted) onSubmitted();
    } catch {
      setError('Network error');
    }
  };

  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-title">Raise maintenance request</div>
        <span className="chip">New</span>
      </div>
      <form onSubmit={handleCreate}>
        <Row gutter={[16, 4]}>
          <Col xs={24} sm={12}>
            <div className="field">
              <label>Block</label>
              <select value={block} onChange={(e) => setBlock(e.target.value)}>
                <option value="Not applicable">Not applicable</option>
                <option value="Block A">Block A</option>
                <option value="Block B">Block B</option>
                <option value="Block C">Block C</option>
              </select>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className="field">
              <label>Flat number</label>
              <input
                value={flatNumber}
                onChange={(e) => setFlatNumber(e.target.value)}
                placeholder="e.g. 304"
              />
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className="field">
              <label>Mobile number</label>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="e.g. 0501234567"
              />
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className="field">
              <label>Type</label>
              <select value={requestType} onChange={(e) => setRequestType(e.target.value)}>
                <option value="maintenance">Maintenance</option>
                <option value="request">Request</option>
              </select>
            </div>
          </Col>
          {requestType === 'maintenance' && (
            <Col xs={24} sm={12}>
              <div className="field">
                <label>Maintenance category</label>
                <select value={maintenanceType} onChange={(e) => setMaintenanceType(e.target.value)}>
                  <option value="Plumber">Plumber</option>
                  <option value="Carpenter">Carpenter</option>
                  <option value="Painter">Painter</option>
                  <option value="Cleaner">Cleaner</option>
                  <option value="Electrician">Electrician</option>
                  <option value="AC Technician">AC Technician</option>
                </select>
              </div>
            </Col>
          )}
          {requestType === 'request' && (
            <Col xs={24} sm={12}>
              <div className="field">
                <label>Title</label>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
            </Col>
          )}
          <Col xs={24}>
            <div className="field">
              <label>
                {requestType === 'maintenance' ? 'Comments' : 'Description'}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </Col>
          <Col xs={24}>
            <div className="field">
              <label>
                Photos{' '}
                <span className="field-note">(optional, up to 5)</span>
              </label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                style={{ display: 'none' }}
                id="tenant-image-upload"
              />
              <label htmlFor="tenant-image-upload" className="btn-outline btn-small file-label">
                Choose photos
              </label>
              {imagePreviews.length > 0 && (
                <div className="image-preview-grid">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="image-preview-item">
                      <img src={src} alt="preview" />
                      <button
                        type="button"
                        className="media-remove-btn"
                        onClick={() => removeImage(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Col>
          <Col xs={24}>
            <div className="field">
              <label>
                Video{' '}
                <span className="field-note">(optional)</span>
              </label>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                style={{ display: 'none' }}
                id="tenant-video-upload"
              />
              <div className="media-row">
                <label
                  htmlFor="tenant-video-upload"
                  className="btn-outline btn-small file-label-inline"
                >
                  Upload / Record video
                </label>
                {mediaVideo && (
                  <span className="media-file-name">{mediaVideo.name}</span>
                )}
              </div>
              {videoPreview && (
                <div className="video-preview-wrap">
                  <video src={videoPreview} controls />
                  <button
                    type="button"
                    className="media-remove-btn"
                    onClick={removeVideo}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className="field">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Emergency</option>
              </select>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className="field">
              <label>Preferred time to visit</label>
              <select value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
                <option>Any time</option>
                <option>7am to 1pm</option>
                <option>1pm to 7pm</option>
              </select>
            </div>
          </Col>
          {error && (
            <Col xs={24}>
              <p className="text-danger">{error}</p>
            </Col>
          )}
          <Col xs={24}>
            <div className="submit-row">
              <button className="btn-primary" type="submit">
                Submit request
              </button>
            </div>
          </Col>
        </Row>
      </form>
    </div>
  );
}

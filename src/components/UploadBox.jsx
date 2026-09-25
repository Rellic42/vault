import { useRef, useState } from 'react';

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (typeof bytes === 'string') return bytes;
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function UploadBox({ file, onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      onFileSelect({
        name: droppedFile.name,
        size: formatBytes(droppedFile.size),
      });
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      onFileSelect({
        name: selectedFile.name,
        size: formatBytes(selectedFile.size),
      });
    }
  };

  return (
    <div className="upload-container">
      <div className="section-intro">
        <h2 className="section-title">Store an object</h2>
        <p className="section-subtitle">Choose how Vault should protect your data.</p>
      </div>

      <div
        className={`dropzone ${isDragging ? 'dropzone-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden-file-input"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        <div className="dropzone-content">
          <p className="dropzone-primary-text">Drop file here</p>
          <p className="dropzone-secondary-text">or <span className="browse-link">browse files</span></p>
        </div>
      </div>

      {file && (
        <div className="selected-file-card">
          <div className="file-info-group">
            <span className="file-label">File:</span>
            <span className="file-value">{file.name}</span>
          </div>
          <div className="file-info-group">
            <span className="file-label">Size:</span>
            <span className="file-value">{file.size}</span>
          </div>
        </div>
      )}
    </div>
  );
}

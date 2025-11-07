// client/src/components/BillScanner.jsx
import React, { useState, useRef } from 'react';
import { scanBill } from '../api/billScannerApi';
import './BillScanner.css';

const BillScanner = ({ onExpenseExtracted, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setScanning(true);
    setError(null);

    try {
      console.log('📸 Starting bill scan...');
      const result = await scanBill(selectedFile);

      if (result.success) {
        console.log('✅ Bill scanned successfully:', result.data);
        setExtractedData(result.data);
        
        // Auto-fill form if callback provided
        if (onExpenseExtracted) {
          onExpenseExtracted(result.data);
        }
      } else {
        setError(result.message || 'Failed to scan bill');
      }
    } catch (err) {
      console.error('❌ Scan error:', err);
      setError('An error occurred while scanning the bill');
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setExtractedData(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUseData = () => {
    if (extractedData && onExpenseExtracted) {
      onExpenseExtracted(extractedData);
      if (onClose) onClose();
    }
  };

  return (
    <div className="bill-scanner-modal">
      <div className="bill-scanner-overlay" onClick={onClose}></div>
      
      <div className="bill-scanner-content">
        <div className="scanner-header">
          <h2>📸 Scan Bill</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="scanner-body">
          {!preview ? (
            <div className="upload-section">
              <div 
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-icon">📄</div>
                <p className="upload-text">Click to upload bill image</p>
                <p className="upload-hint">Supports JPG, PNG, WebP (Max 5MB)</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="preview-section">
              <div className="image-preview">
                <img src={preview} alt="Bill preview" />
              </div>

              {extractedData && (
                <div className="extracted-data">
                  <h3>✨ Extracted Information</h3>
                  
                  <div className="data-grid">
                    {extractedData.merchantName && (
                      <div className="data-item">
                        <label>Merchant:</label>
                        <span>{extractedData.merchantName}</span>
                      </div>
                    )}
                    
                    {extractedData.totalAmount && (
                      <div className="data-item highlight">
                        <label>Total Amount:</label>
                        <span className="amount">₹{extractedData.totalAmount}</span>
                      </div>
                    )}
                    
                    {extractedData.date && (
                      <div className="data-item">
                        <label>Date:</label>
                        <span>{new Date(extractedData.date).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    {extractedData.category && (
                      <div className="data-item">
                        <label>Category:</label>
                        <span>{extractedData.category}</span>
                      </div>
                    )}

                    {extractedData.items && extractedData.items.length > 0 && (
                      <div className="data-item full-width">
                        <label>Items:</label>
                        <ul className="items-list">
                          {extractedData.items.map((item, index) => (
                            <li key={index}>
                              {item.name} - ₹{item.price}
                              {item.quantity && ` (×${item.quantity})`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {extractedData.paymentMethod && (
                      <div className="data-item">
                        <label>Payment Method:</label>
                        <span>{extractedData.paymentMethod}</span>
                      </div>
                    )}
                  </div>

                  {extractedData.confidence && (
                    <div className="confidence-indicator">
                      <span>Confidence: {Math.round(extractedData.confidence * 100)}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}
        </div>

        <div className="scanner-actions">
          {!extractedData ? (
            <>
              <button 
                className="btn-secondary" 
                onClick={handleReset}
                disabled={!preview}
              >
                Clear
              </button>
              <button 
                className="btn-primary" 
                onClick={handleScan}
                disabled={!selectedFile || scanning}
              >
                {scanning ? (
                  <>
                    <span className="spinner-small"></span>
                    Scanning...
                  </>
                ) : (
                  '🔍 Scan Bill'
                )}
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={handleReset}>
                Scan Another
              </button>
              <button className="btn-primary" onClick={handleUseData}>
                ✓ Use This Data
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillScanner;
// client/src/api/billScannerApi.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000, // 30 seconds for OCR processing
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || 
                localStorage.getItem('token') || 
                sessionStorage.getItem('authToken') ||
                sessionStorage.getItem('token');
                
  if (token) {
    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  
  return config;
});

/**
 * Scan a bill image using Gemini AI OCR
 * @param {File} imageFile - The bill image file
 * @returns {Promise} - Extracted expense data
 */
export const scanBill = async (imageFile) => {
  try {
    console.log('📸 Scanning bill:', {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type
    });

    // Create FormData
    const formData = new FormData();
    formData.append('bill', imageFile);

    // Send to backend
    const response = await api.post('/bills/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      console.log('✅ Bill scanned successfully:', response.data);
      return {
        success: true,
        data: response.data.data,
        message: 'Bill scanned successfully'
      };
    } else {
      console.error('❌ Bill scan failed:', response.data.message);
      return {
        success: false,
        message: response.data.message || 'Failed to scan bill'
      };
    }

  } catch (error) {
    console.error('❌ Bill scan error:', error);
    
    if (error.response?.status === 401) {
      return {
        success: false,
        message: 'Authentication required'
      };
    }

    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to scan bill'
    };
  }
};

/**
 * Get scan history
 * @returns {Promise} - List of previous scans
 */
export const getScanHistory = async () => {
  try {
    const response = await api.get('/bills/scan-history');
    
    return {
      success: true,
      scans: response.data.scans || []
    };
  } catch (error) {
    console.error('❌ Error fetching scan history:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch scan history',
      scans: []
    };
  }
};

export default {
  scanBill,
  getScanHistory
};
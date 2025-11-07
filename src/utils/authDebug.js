// src/utils/authDebug.js
export const debugAuth = async () => {
  console.log('=== COMPREHENSIVE AUTH DEBUG ===');
  
  // Step 1: Check all possible token locations
  const tokens = {
    'localStorage.token': localStorage.getItem('token'),
    'localStorage.authToken': localStorage.getItem('authToken'),
    'sessionStorage.token': sessionStorage.getItem('token'),
    'sessionStorage.authToken': sessionStorage.getItem('authToken')
  };
  
  console.log('Available tokens:', tokens);
  
  // Find the first available token
  const activeToken = Object.values(tokens).find(token => token);
  
  if (!activeToken) {
    console.error('NO TOKEN FOUND');
    return { error: 'No authentication token found' };
  }
  
  console.log('Active token details:', {
    length: activeToken.length,
    starts: activeToken.substring(0, 30) + '...',
    isJWT: activeToken.includes('.'),
    parts: activeToken.split('.').length
  });
  
  // Step 2: Decode JWT payload (client-side validation)
  try {
    const parts = activeToken.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format - expected 3 parts, got:', parts.length);
      return { error: 'Invalid JWT format' };
    }
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    console.log('Token payload:', {
      userId: payload.userId || payload.id,
      id: payload.id,
      email: payload.email,
      iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'No issued time',
      exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'No expiration',
      isExpired: payload.exp ? now > payload.exp : false,
      expiresIn: payload.exp ? payload.exp - now : 'Never'
    });
    
    // Check if token is expired
    if (payload.exp && now > payload.exp) {
      console.error('TOKEN IS EXPIRED');
      return { error: 'Token is expired', payload };
    }
    
  } catch (decodeError) {
    console.error('Failed to decode token:', decodeError);
    return { error: 'Failed to decode token', details: decodeError.message };
  }
  
  // Step 3: Test API call with detailed debugging
  try {
    console.log('Testing API call...');
    
    const response = await fetch('http://localhost:4000/api/transactions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${activeToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 401) {
      console.error('401 UNAUTHORIZED - Auth failed');
      try {
        const errorData = JSON.parse(responseText);
        return { 
          error: '401 Unauthorized', 
          message: errorData.message || 'Authentication failed',
          details: errorData 
        };
      } catch (parseError) {
        return { 
          error: '401 Unauthorized', 
          message: responseText || 'Authentication failed' 
        };
      }
    } else if (response.ok) {
      console.log('API call successful');
      return { success: true };
    } else {
      console.error(`API call failed with status ${response.status}`);
      return { 
        error: `API call failed (${response.status})`, 
        details: responseText 
      };
    }
    
  } catch (networkError) {
    console.error('Network error:', networkError);
    return { 
      error: 'Network error', 
      details: networkError.message 
    };
  }
};

export const testBackendHealth = async () => {
  console.log('Testing backend health...');
  
  try {
    const response = await fetch('http://localhost:4000/health');
    const data = await response.json();
    console.log('Backend health:', data);
    return data;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return { error: 'Backend unreachable' };
  }
};

export const fixTokenIssues = () => {
  console.log('Attempting to fix token issues...');
  
  // 1. Consolidate tokens - use localStorage.token as primary
  const tokens = [
    localStorage.getItem('token'),
    localStorage.getItem('authToken'),
    sessionStorage.getItem('token'),
    sessionStorage.getItem('authToken')
  ].filter(Boolean);
  
  if (tokens.length === 0) {
    console.log('No tokens to fix - user needs to log in');
    return false;
  }
  
  // Use the first valid token found
  const primaryToken = tokens[0];
  
  // Clear all token storage locations
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('authToken');
  
  // Set the primary token in localStorage.token
  localStorage.setItem('token', primaryToken);
  
  console.log('Token consolidated to localStorage.token');
  return true;
};
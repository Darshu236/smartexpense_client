// AuthDebugHelper.js - Add this to help diagnose authentication issues
class AuthDebugHelper {
  static checkAuthState() {
    console.log('=== Authentication Debug Info ===');
    
    // Check all possible token storage locations
    const tokenSources = {
      'localStorage.authToken': localStorage.getItem('authToken'),
      'sessionStorage.authToken': sessionStorage.getItem('authToken'),
      'localStorage.token': localStorage.getItem('token'),
      'sessionStorage.token': sessionStorage.getItem('token'),
      'localStorage.jwt': localStorage.getItem('jwt'),
      'sessionStorage.jwt': sessionStorage.getItem('jwt')
    };
    
    console.log('Token sources:', tokenSources);
    
    // Check user data
    const userData = {
      'localStorage.user': localStorage.getItem('user'),
      'sessionStorage.user': sessionStorage.getItem('user'),
      'localStorage.currentUser': localStorage.getItem('currentUser')
    };
    
    console.log('User data:', userData);
    
    // Check what TokenManager returns
    try {
      const tokenManagerUser = TokenManager.getUser();
      console.log('TokenManager.getUser():', tokenManagerUser);
    } catch (e) {
      console.error('TokenManager error:', e);
    }
    
    // Test API call with current auth
    const apiService = new DebtApiService();
    console.log('Current auth headers:', apiService.getAuthHeaders());
    
    return {
      hasToken: Object.values(tokenSources).some(token => token),
      hasUser: Object.values(userData).some(user => user),
      tokens: tokenSources,
      users: userData
    };
  }
  
  static async testAuthEndpoint() {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: new DebtApiService().getAuthHeaders()
      });
      
      console.log('Auth test response:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Auth test data:', data);
        return { success: true, data };
      } else {
        return { success: false, status: response.status };
      }
    } catch (error) {
      console.error('Auth test failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  static fixCommonAuthIssues() {
    console.log('Attempting to fix common auth issues...');
    
    // Try to find token in any storage location
    const possibleTokens = [
      localStorage.getItem('authToken'),
      sessionStorage.getItem('authToken'), 
      localStorage.getItem('token'),
      sessionStorage.getItem('token'),
      localStorage.getItem('jwt'),
      sessionStorage.getItem('jwt')
    ].filter(Boolean);
    
    if (possibleTokens.length > 0) {
      const token = possibleTokens[0];
      console.log('Found token, standardizing storage...');
      
      // Standardize to authToken in localStorage
      localStorage.setItem('authToken', token);
      sessionStorage.setItem('authToken', token);
      
      console.log('Token standardized. Try refreshing the page.');
      return true;
    }
    
    console.log('No valid tokens found. User needs to log in again.');
    return false;
  }
}

// Add to your DebtManager component's useEffect or call manually
export default AuthDebugHelper;
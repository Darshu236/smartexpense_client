import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, UserMinus, Users, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import './FriendsPage.css';

// Import the actual API
import { fetchFriends, searchUsers, addFriend, removeFriend } from '../api/friendsApi.js';

const FriendsPage = () => {
  const [friends, setFriends] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [error, setError] = useState(null);

  const searchTimeoutRef = useRef(null);

  // Load friends on component mount
  useEffect(() => {
    loadFriends();
  }, []);

  // Search users with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, friends]); // Added friends dependency to re-search when friends change

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleError = (error, operation) => {
    console.error(`Error in ${operation}:`, error);
    
    if (error.isAuthError || (error.response?.status === 401)) {
      setError('Authentication failed. Please log in again.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }

    const errorMessage = error.response?.data?.message || error.message || `${operation} failed`;
    showMessage('error', errorMessage);
  };

  const loadFriends = async () => {
    console.log('loadFriends: Starting to load friends...');
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('loadFriends: Calling fetchFriends API...');
      const result = await fetchFriends();
      
      console.log('loadFriends: Raw API result:', result);
      
      if (result.success) {
        console.log('loadFriends: Success flag is true');
        console.log('loadFriends: Friends data:', result.friends);
        
        // Validate and normalize friends data
        if (!result.friends || !Array.isArray(result.friends)) {
          console.warn('loadFriends: Invalid friends data');
          setFriends([]);
        } else {
          // Log the raw data to see what we're working with
          console.log('loadFriends: Raw friends array:', JSON.stringify(result.friends, null, 2));
          
          // Normalize friend data structure
          const normalizedFriends = result.friends.map(friend => {
            console.log('Processing friend:', friend);
            
            // The API returns friendship records with friend data at root level
            // Extract the actual friend user data
            const friendData = {
              _id: friend._id,
              name: friend.name,
              email: friend.email,
              userId: friend.userId,
              status: friend.status || 'active'
            };
            
            console.log('Normalized to:', friendData);
            return friendData;
          }).filter(f => f._id && f.name); // Filter out invalid entries
          
          console.log('loadFriends: Normalized', normalizedFriends.length, 'friends');
          console.log('loadFriends: Final friends list:', normalizedFriends);
          setFriends(normalizedFriends);
        }
      } else if (result.authError) {
        console.error('loadFriends: Auth error detected');
        setError('Authentication required. Redirecting to login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        console.error('loadFriends: API returned success: false');
        throw new Error(result.message || 'Failed to load friends');
      }
    } catch (error) {
      console.error('loadFriends: Exception caught:', error);
      handleError(error, 'Loading friends');
    } finally {
      console.log('loadFriends: Finally block - setting loading to false');
      setLoading(false);
    }
  };

const performSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    console.log('performSearch: Searching for:', searchQuery);

    try {
      setSearching(true);
      
      const result = await searchUsers(searchQuery.trim());
      console.log('performSearch: Search result:', result);
      
      if (result.success) {
        // Filter out users who are already friends
        // Use userId (the actual User._id from normalized data)
        const friendUserIds = friends.map(f => f.userId || f._id).filter(Boolean);
        console.log('performSearch: Current friend user IDs:', friendUserIds);
        
        const filteredUsers = result.users.filter(user => !friendUserIds.includes(user._id));
        console.log('performSearch: Filtered users:', filteredUsers.length);
        
        setSearchResults(filteredUsers);
      } else if (result.authError) {
        handleError(new Error('Authentication failed'), 'Search users');
      } else {
        throw new Error(result.message || 'Search failed');
      }
    } catch (error) {
      console.error('performSearch: Error:', error);
      handleError(error, 'Search users');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (user) => {
    console.log('handleAddFriend: Adding friend:', user);
    const actionId = `add-${user._id}`;
    
    try {
      setActionLoading(prev => ({ ...prev, [actionId]: true }));
      
      const result = await addFriend(user._id);
      console.log('handleAddFriend: Add friend result:', result);
      
      if (result.success) {
        console.log('handleAddFriend: Friend added successfully');
        
        // Remove from search results immediately
        setSearchResults(prev => prev.filter(u => u._id !== user._id));
        
        // Reload the friends list to ensure consistency
        await loadFriends();
        
        // Clear search query to reset the search
        setSearchQuery('');
        
        showMessage('success', `${user.name} added as friend!`);
      } else {
        throw new Error(result.message || 'Failed to add friend');
      }
    } catch (error) {
      console.error('handleAddFriend: Error:', error);
      handleError(error, 'Add friend');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionId]: false }));
    }
  };

  const handleRemoveFriend = async (friend) => {
    console.log('handleRemoveFriend: Removing friend:', friend);
    const actionId = `remove-${friend._id}`;
    
    try {
      setActionLoading(prev => ({ ...prev, [actionId]: true }));
      
      const result = await removeFriend(friend._id);
      console.log('handleRemoveFriend: Remove friend result:', result);
      
      if (result.success) {
        console.log('handleRemoveFriend: Friend removed successfully');
        
        // Reload the friends list to ensure consistency
        await loadFriends();
        
        showMessage('success', `${friend.name} removed from friends`);
      } else {
        throw new Error(result.message || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('handleRemoveFriend: Error:', error);
      handleError(error, 'Remove friend');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionId]: false }));
    }
  };

  // Debug current state
  console.log('FriendsPage Render:', {
    loading,
    error,
    friendsCount: friends.length,
    friends: friends,
    searchResultsCount: searchResults.length
  });

  if (error) {
    return (
      <div className="friends-container">
        <div className="error-state">
          <AlertCircle size={48} className="error-icon" />
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    console.log('Rendering loading state...');
    return (
      <div className="friends-container">
        <div className="loading-state">
          <Loader size={48} className="spinner" />
          <p>Loading friends...</p>
        </div>
      </div>
    );
  }

  console.log('Rendering main friends UI');

  return (
    <div className="friends-container">
      {/* Header */}
      <header className="friends-header">
        <div className="header-content">
          <Users size={32} />
          <h1>Friends</h1>
        </div>
        <p className="header-subtitle">Manage your expense sharing network</p>
        <button 
          onClick={loadFriends} 
          className="btn btn-primary"
          style={{ marginTop: '10px' }}
        >
          Refresh Friends List
        </button>
      </header>

      {/* Message Display */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Search Section */}
      <section className="search-section">
        <div className="section-header">
          <h2>Add New Friends</h2>
        </div>
        
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, email, or userId"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              autoComplete="off"
            />
          </div>

          {/* Search Status */}
          {searching && (
            <div className="search-status">
              <Loader size={20} className="spinner" />
              <span>Searching...</span>
            </div>
          )}

          {/* Search Results */}
          {searchQuery.length >= 2 && !searching && (
            <div className="search-results">
              <h3>Search Results ({searchResults.length})</h3>
              
              {searchResults.length === 0 ? (
                <div className="empty-state">
                  <Users size={32} />
                  <h4>No users found</h4>
                  <p>Try searching with a different name, email, or userId</p>
                </div>
              ) : (
                <ul className="user-list">
                  {searchResults.map((user) => (
                    <li key={user._id} className="user-item">
                      <div className="user-info">
                        <h4 className="user-name">{user.name}</h4>
                        <p className="user-email">{user.email}</p>
                        <p className="user-id">{user.userId}</p>
                      </div>
                      
                      <button
                        onClick={() => handleAddFriend(user)}
                        disabled={actionLoading[`add-${user._id}`]}
                        className="btn btn-success"
                      >
                        {actionLoading[`add-${user._id}`] ? (
                          <>
                            <Loader size={16} className="spinner" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <UserPlus size={16} />
                            Add Friend
                          </>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Friends List Section */}
      <section className="friends-section">
        <div className="section-header">
          <h2>My Friends ({friends.length})</h2>
        </div>

        {friends.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No friends yet</h3>
            <p>Start by searching for friends above!</p>
          </div>
        ) : (
          <ul className="user-list">
            {friends.map((friend) => (
              <li key={friend._id} className="user-item">
                <div className="user-info">
                  <h4 className="user-name">{friend.name}</h4>
                  <p className="user-email">{friend.email}</p>
                  <p className="user-id">{friend.userId}</p>
                </div>
                
                <button
                  onClick={() => handleRemoveFriend(friend)}
                  disabled={actionLoading[`remove-${friend._id}`]}
                  className="btn btn-danger"
                >
                  {actionLoading[`remove-${friend._id}`] ? (
                    <>
                      <Loader size={16} className="spinner" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <UserMinus size={16} />
                      Remove
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default FriendsPage;
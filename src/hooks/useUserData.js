import { useEffect, useState } from 'react';
import { fetchUsers, fetchFriends, addFriend } from '../api/userApi';

const useUserData = () => {
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      const res = await fetchUsers();
      setUsers(res.data);
    } catch (err) {
      setError('Error fetching users');
      console.error(err);
    }
  };

  const loadFriends = async () => {
    try {
      const res = await fetchFriends();
      setFriends(res.data);
    } catch (err) {
      setError('Error fetching friends');
      console.error(err);
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      await addFriend(userId);
      await loadFriends(); // Refresh friend list after adding
    } catch (err) {
      console.error('Error adding friend:', err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadFriends();
  }, []);

  return { users, friends, error, handleAddFriend };
};

export default useUserData;

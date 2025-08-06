import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { API_ENDPOINTS, apiCall } from '../config/api';
import './UserManagement.css';

const UserManagement = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (currentUser.role === 'superadmin') {
        const result = await apiCall(`${API_ENDPOINTS.ADMIN}/users`, { method: 'GET' });
        if (result.success) {
          setUsers(result.data.users);
        } else {
          setError(result.error);
        }
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser]);

  const handleRoleChange = async (id, newRole) => {
    const user = users.find(u => u.id === id);
    const result = await apiCall(`${API_ENDPOINTS.ADMIN}/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        name: user.name, 
        email: user.email, 
        role: newRole,
        status: user.status 
      }),
    });
    if (result.success) {
      setUsers(users.map(user => user.id === id ? { ...user, role: newRole } : user));
    } else {
      alert('Failed to update role: ' + result.error);
    }
  };

  const handleDeleteUser = async (id) => {
    const result = await apiCall(`${API_ENDPOINTS.ADMIN}/users/${id}`, { method: 'DELETE' });
    if (result.success) {
      setUsers(users.filter(user => user.id !== id));
    } else {
      alert('Failed to delete user');
    }
  };

  const handleMarkResigned = async (id) => {
    const user = users.find(u => u.id === id);
    const result = await apiCall(`${API_ENDPOINTS.ADMIN}/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        name: user.name, 
        email: user.email, 
        role: user.role,
        status: 'resigned' 
      }),
    });
    if (result.success) {
      setUsers(users.map(user => user.id === id ? { ...user, status: 'resigned' } : user));
    } else {
      alert('Failed to mark user as resigned: ' + result.error);
    }
  };

  if (loading) return <p>Loading users...</p>;
  if (error) return <p>Error loading users: {error}</p>;

  return (
    <div className="user-management">
      <h2>Manage Users</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <select
                  value={user.role}
                  onChange={e => handleRoleChange(user.id, e.target.value)}
                  disabled={user.status !== 'active'}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </td>
              <td>{user.status}</td>
              <td>
                <button onClick={() => handleMarkResigned(user.id)} disabled={user.status !== 'active'}>Mark as Resigned</button>
                <button onClick={() => handleDeleteUser(user.id)} disabled={user.status !== 'active'}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagement;


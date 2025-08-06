//import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import ProtectedRoute from './ProtectedRoute';
import Profile from './components/Profile';
import Security from './components/Security';
import ActivityLog from './components/ActivityLog';
import UserManagement from './components/UserManagement';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/security" element={
            <ProtectedRoute>
              <Security />
            </ProtectedRoute>
          } />
          <Route path="/activity" element={
            <ProtectedRoute>
              <ActivityLog />
            </ProtectedRoute>
          } />
          <Route path="/user-management" element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          } />
        </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

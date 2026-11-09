import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Splash from './pages/Splash.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Chat from './pages/Chat.jsx';
import CreateCharacter from './pages/CreateCharacter.jsx';
import EditCharacter from './pages/EditCharacter.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import AboutMe from './pages/AboutMe.jsx';
import './styles.css';

function RequireAuth({ children }) {
  const { token } = AuthProvider.use();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/chat/:id" element={<RequireAuth><Chat /></RequireAuth>} />
        <Route path="/create" element={<RequireAuth><CreateCharacter /></RequireAuth>} />
        <Route path="/edit/:id" element={<RequireAuth><EditCharacter /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/profile/about" element={<RequireAuth><AboutMe /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

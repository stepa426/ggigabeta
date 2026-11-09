import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

function Stars() {
  const stars = React.useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 3,
      color: Math.random() > 0.5 ? '#cfc4ff' : '#ffe98a',
    })), []);
  return (
    <div className="stars-bg">
      {stars.map((s) => (
        <span key={s.id} style={{
          top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size,
          background: s.color, animationDelay: `${s.delay}s`,
        }} />
      ))}
    </div>
  );
}

export { Stars };

export default function Splash() {
  const nav = useNavigate();
  const { token } = AuthProvider.use();
  useEffect(() => {
    const t = setTimeout(() => nav(token ? '/home' : '/login', { replace: true }), 1600);
    return () => clearTimeout(t);
  }, [token, nav]);
  return (
    <div className="splash">
      <Stars />
      <div className="splash-logo">GIGA</div>
      <div className="splash-bubble">🗨️</div>
    </div>
  );
}

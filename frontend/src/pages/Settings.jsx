import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

export default function Settings() {
  const nav = useNavigate();
  const { user, logout } = AuthProvider.use();

  const items = [
    { ic: '✈️', label: 'Поддержка', action: () => alert('Поддержка: support@gigaguru.tech') },
    { ic: '👥', label: 'Мы в соцсетях', action: () => alert('Telegram: t.me/giga_app') },
    { ic: '⭐', label: 'Оценить приложение', action: () => window.open('https://play.google.com/store/apps/details?id=com.sdkit.gigaapp.app', '_blank') },
    { ic: '👤', label: 'Пригласить друга', action: () => {
      navigator.clipboard?.writeText(location.origin);
      alert('Ссылка скопирована! Друг получит +50 кристаллов, а и ты тоже.');
    } },
    { ic: '📱', label: 'Версия приложения', action: () => alert('GIGA Web 1.0.0') },
    { ic: '📄', label: 'Лицензионное соглашение', action: () => alert('GIGA — демонстрационная веб-версия. GigaChat предоставляется ООО «Сбер».') },
  ];

  return (
    <div className="phone-wrap">
      <div className="header">
        <button className="icon-btn" onClick={() => nav(-1)}>←</button>
        <div className="title">Настройки</div>
        <button className="icon-btn">⋮</button>
      </div>
      <div className="page">
        <div className="settings-list">
          {items.map((it) => (
            <button key={it.label} className="settings-item" onClick={it.action}>
              <span className="ic">{it.ic}</span>{it.label}<span className="chev">›</span>
            </button>
          ))}
        </div>
        <button className="danger-link" onClick={() => { logout(); nav('/login'); }}>
          Выйти из аккаунта{user?.username ? ` (@${user.username})` : ''}
        </button>
      </div>
    </div>
  );
}

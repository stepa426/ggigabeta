import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

export default function AboutMe() {
  const nav = useNavigate();
  const { user, api, refresh } = AuthProvider.use();
  const [about, setAbout] = useState(user?.about || '');
  const [username, setUsername] = useState(user?.username || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setBusy(true); setErr('');
    try {
      await api('/api/user/me', { method: 'PUT', body: JSON.stringify({ about, username }) });
      await refresh();
      nav('/profile');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="phone-wrap">
      <div className="header">
        <button className="icon-btn" onClick={() => nav(-1)}>←</button>
        <div className="title">Обо мне</div>
        <span style={{ width: 40 }} />
      </div>
      <div className="page page-pad" style={{ paddingTop: 8 }}>
        <div className="field">
          <label>Имя пользователя</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} />
        </div>
        <div className="field">
          <label>Обо мне</label>
          <textarea rows={5} value={about} onChange={(e) => setAbout(e.target.value)} maxLength={280}
            placeholder="*приветственно мурлыкает*" />
          <div className="counter">{about.length}/280</div>
        </div>
        <button className="primary-btn" style={{ width: '100%' }} onClick={save} disabled={busy}>
          {busy ? 'Сохранение…' : 'Сохранить'}
        </button>
        {err && <div className="error-toast" style={{ position: 'static', marginTop: 12 }}>{err}</div>}
      </div>
    </div>
  );
}

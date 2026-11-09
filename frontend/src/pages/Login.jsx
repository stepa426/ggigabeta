import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { Stars } from './Splash.jsx';

const GOOGLE_CLIENT_ID = window.__GIGA_CONFIG__?.GOOGLE_CLIENT_ID || '';

export default function Login() {
  const nav = useNavigate();
  const { applySession } = AuthProvider.use();
  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function googleLogin(credential) {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/auth/google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Ошибка входа');
      applySession(data.token, data.user);
      nav('/home');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  function initGoogle() {
    if (!GOOGLE_CLIENT_ID) {
      setErr('Google-вход не настроен: задайте GOOGLE_CLIENT_ID на сервере (см. .env.example). Используйте вход по номеру телефона.');
      return;
    }
    // Google Identity Services подгружается динамически
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp) => googleLogin(resp.credential),
      });
      window.google.accounts.id.prompt();
    };
    document.head.appendChild(s);
  }

  async function requestCode() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/auth/phone/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setCodeSent(true);
      if (data.devCode) setErr(`Демо-режим: код ${data.devCode}`);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function verifyCode() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/auth/phone/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      applySession(data.token, data.user);
      nav('/home');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="login-page">
      <Stars />
      <div className="login-logo">GIGA</div>
      <div className="login-sub">Общайся с ИИ-персонажами,<br />создавай своих и получай кристаллы каждый день</div>

      {!phoneMode ? (
        <>
          <button className="btn-google" onClick={initGoogle} disabled={busy}>
            <span style={{ fontWeight: 900, fontSize: 18 }}>G</span> Войти через Google
          </button>
          <button className="btn-phone" onClick={() => setPhoneMode(true)}>📞 Войти по номеру телефона</button>
        </>
      ) : (
        <div className="phone-panel">
          {!codeSent ? (
            <>
              <input placeholder="+7XXXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
              <button className="btn-phone" onClick={requestCode} disabled={busy || phone.length < 7}>Получить код</button>
            </>
          ) : (
            <>
              <input placeholder="Код из SMS" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={4} />
              <button className="btn-phone" onClick={verifyCode} disabled={busy || code.length < 4}>Войти</button>
            </>
          )}
          <button className="btn-phone" style={{ border: 'none', background: 'none', color: 'var(--text-dim)' }} onClick={() => setPhoneMode(false)}>← Назад</button>
        </div>
      )}

      <div className="bonus-pill">💎 +50 кристаллов каждый день после входа</div>
      {err && <div className="error-toast" style={{ position: 'static', marginTop: 20 }}>{err}</div>}
    </div>
  );
}

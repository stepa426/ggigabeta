import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('giga_token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('giga_user') || 'null'); } catch { return null; }
  });

  const applySession = useCallback((t, u) => {
    setToken(t); setUser(u);
    localStorage.setItem('giga_token', t);
    localStorage.setItem('giga_user', JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setToken(null); setUser(null);
    localStorage.removeItem('giga_token');
    localStorage.removeItem('giga_user');
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    const r = await fetch('/api/user/me', { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) {
      const u = await r.json();
      setUser(u);
      localStorage.setItem('giga_user', JSON.stringify(u));
    }
  }, [token]);

  const api = useCallback(async (path, opts = {}) => {
    const r = await fetch(path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.message || data.error || 'Ошибка'), { status: r.status, data });
    return data;
  }, [token]);

  return <Ctx.Provider value={{ token, user, applySession, logout, refresh, api }}>{children}</Ctx.Provider>;
}

AuthProvider.use = () => useContext(Ctx);

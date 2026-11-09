import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

const CATEGORIES = ['Все', 'Аниме', 'Кино', 'Игры', 'Животные', 'Психолог', 'Астролог', 'Разное'];

export default function Home() {
  const nav = useNavigate();
  const { user, api, refresh } = AuthProvider.use();
  const [chars, setChars] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Все');
  const [showBonus, setShowBonus] = useState(false);
  const [bonusInfo, setBonusInfo] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat !== 'Все') params.set('category', cat);
      const data = await api(`/api/characters?${params}`);
      setChars(data);
    } catch (e) { setErr(e.message); }
  }, [api, q, cat]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (user?.bonusAvailable) setShowBonus(true);
  }, [user?.bonusAvailable]);

  async function claimBonus() {
    try {
      const data = await api('/api/auth/daily-bonus', { method: 'POST' });
      setBonusInfo(data);
      await refresh();
      if (!data.granted) setErr(data.message);
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="phone-wrap">
      <div className="header">
        <button className="icon-btn" onClick={() => nav('/profile')}>👤</button>
        <div className="title" style={{ fontFamily: 'Arial Black' }}>GIGA</div>
        <button className="icon-btn" onClick={() => nav('/settings')}>☰</button>
      </div>

      <div className="home-scroll">
        <div className="search-row">
          <input className="search" placeholder="Поиск персонажей" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>

        <div className="section-title">
          {cat === 'Все' ? 'Популярные персонажи' : cat}
        </div>

        <div className="char-grid">
          {chars.map((c) => (
            <button key={c.id} className="char-card" onClick={() => nav(`/chat/${c.id}`)}>
              {c.avatar ? <img className="char-ava" src={c.avatar} alt="" /> : <div className="char-ava" />}
              <div className="char-info">
                <div className="char-name">{c.name}</div>
                {c.kind && <div className="char-desc">{c.kind}</div>}
                <div className="char-meta">
                  <span>♥ {c.likes}</span>
                  <span>💬 {c.likes > 0 ? Math.round(c.likes * 2.3) : 12}</span>
                </div>
              </div>
              <span
                className={`fav-btn ${c.is_favorite ? 'on' : ''}`}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const r = await api(`/api/characters/${c.id}/favorite`, { method: 'POST' });
                    setChars((prev) => prev.map((x) => x.id === c.id ? { ...x, is_favorite: r.is_favorite } : x));
                  } catch (e2) { setErr(e2.message); }
                }}
              >{c.is_favorite ? '❤' : '♡'}</span>
            </button>
          ))}
          {chars.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
              Пока пусто. Создай первого персонажа!
            </div>
          )}
        </div>
      </div>

      <button className="fab" onClick={() => nav('/create')}>+</button>

      <div className="tabbar">
        <button className="active"><span className="ticon">💬</span>Чаты</button>
        <button onClick={() => nav('/create')}><span className="ticon">✨</span>Создать</button>
        <button onClick={() => nav('/profile')}><span className="ticon">👤</span>Профиль</button>
      </div>

      {showBonus && !bonusInfo && (
        <div className="modal-backdrop" onClick={() => setShowBonus(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="gem">💎</div>
            <h3>Ежедневный бонус</h3>
            <p>Заходи каждый день и получай 50 кристаллов!</p>
            <button className="primary-btn" style={{ margin: 0 }} onClick={claimBonus}>Забрать 50 💎</button>
          </div>
        </div>
      )}
      {bonusInfo?.granted && (
        <div className="modal-backdrop" onClick={() => setBonusInfo(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="gem">🎉</div>
            <h3>+{bonusInfo.amount} кристаллов!</h3>
            <p>Серия входов: {bonusInfo.streak} дн. Всего: {bonusInfo.crystals} 💎<br />Возвращайся завтра!</p>
            <button className="primary-btn" style={{ margin: 0 }} onClick={() => setBonusInfo(null)}>Отлично!</button>
          </div>
        </div>
      )}

      {err && <div className="error-toast" onClick={() => setErr('')}>{err}</div>}
    </div>
  );
}

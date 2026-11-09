import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

export default function Profile() {
  const nav = useNavigate();
  const { user, api, refresh } = AuthProvider.use();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('fav');
  const [err, setErr] = useState('');
  const [showBonus, setShowBonus] = useState(false);
  const [bonusInfo, setBonusInfo] = useState(null);

  async function load() {
    try { setData(await api('/api/user/profile')); }
    catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function claimBonus() {
    try {
      const d = await api('/api/auth/daily-bonus', { method: 'POST' });
      setBonusInfo(d); await refresh(); await load();
    } catch (e) { setErr(e.message); }
  }

  if (!data) return <div className="phone-wrap" />;

  const list = tab === 'fav' ? data.favorites : data.mine.filter((c) => (tab === 'pub' ? c.is_public : !c.is_public));

  return (
    <div className="phone-wrap">
      <div className="page" style={{ paddingTop: 'calc(12px + var(--safe-top))' }}>
        <div className="profile-head">
          <button className="icon-btn gear" onClick={() => nav('/settings')}>⚙️</button>
          {data.avatar
            ? <img className="profile-ava" src={data.avatar} alt="" />
            : <div className="profile-ava" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>👤</div>}
          <div className="profile-username">@{data.username}</div>
        </div>

        <div className="profile-about">
          <h2>Обо мне</h2>
          <p>{data.about || '—'}</p>
        </div>

        <div className="stat-row">
          <div className="stat"><b>{data.counts.characters}</b><span>Персонажей</span></div>
          <div className="stat"><b>{data.counts.followers}</b><span>Подписчиков</span></div>
          <div className="stat"><b>{data.counts.favorites}</b><span>В избранном</span></div>
        </div>

        <div className="crystal-chip">💎 {data.crystals} кристаллов</div>

        <div className="action-row">
          <button onClick={() => nav('/profile/about')}>✏️ Изменить</button>
          <button onClick={() => {
            const url = `${location.origin}/?ref=@${data.username}`;
            navigator.clipboard?.writeText(url);
            alert('Ссылка на профиль скопирована!');
          }}>📤 Поделиться</button>
        </div>

        <div className="section-title">Персонажи</div>
        <div className="list-tabs">
          {[['fav', 'Избранные'], ['pub', 'Мои публичные'], ['priv', 'Мои приватные']].map(([k, label]) => (
            <button key={k} className={`chip ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        <div className="char-grid">
          {list.map((c) => (
            <button key={c.id} className="char-card" onClick={() => nav(`/chat/${c.id}`)}>
              {c.avatar ? <img className="char-ava" src={c.avatar} alt="" /> : <div className="char-ava" />}
              <div className="char-info">
                <div className="char-name">{c.name}</div>
                <div className="char-desc">{c.kind || c.category}</div>
              </div>
              <span onClick={(e) => { e.stopPropagation(); nav(`/edit/${c.id}`); }} style={{ color: 'var(--text-dim)', padding: 8 }}>✏️</span>
            </button>
          ))}
          {list.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 30 }}>
              {tab === 'fav' ? 'Нет избранных персонажей' : 'Нет персонажей. Создай своего!'}
            </div>
          )}
        </div>

        {user?.bonusAvailable && !bonusInfo && (
          <button className="primary-btn" onClick={claimBonus}>💎 Забрать ежедневный бонус +50</button>
        )}
      </div>

      {bonusInfo?.granted && (
        <div className="modal-backdrop" onClick={() => setBonusInfo(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="gem">🎉</div>
            <h3>+{bonusInfo.amount} кристаллов!</h3>
            <p>Серия: {bonusInfo.streak} дн. Всего: {bonusInfo.crystals} 💎</p>
            <button className="primary-btn" style={{ margin: 0 }} onClick={() => setBonusInfo(null)}>Отлично!</button>
          </div>
        </div>
      )}
      {err && <div className="error-toast" onClick={() => setErr('')}>{err}</div>}
    </div>
  );
}

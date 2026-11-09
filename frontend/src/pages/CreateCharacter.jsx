import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

export function CharacterForm({ initial, onSubmit, onDelete, busy, err }) {
  const [tab, setTab] = useState('main');
  const [f, setF] = useState({
    name: initial?.name || '',
    kind: initial?.kind || '',
    gender: initial?.gender || 'Мужской',
    about: initial?.about || '',
    greeting: initial?.greeting || '',
    persona: initial?.persona || '',
    can_draw: initial?.can_draw || false,
    avatar: initial?.avatar || '',
    category: initial?.category || 'Разное',
    is_public: initial?.is_public ?? true,
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  function onAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('avatar', reader.result); // data-url, сохраняется в БД
    reader.readAsDataURL(file);
  }

  return (
    <div className="phone-wrap">
      <div className="header">
        <button className="icon-btn" onClick={() => history.back()}>←</button>
        <div className="title">{initial ? 'Редактирование' : 'Создание персонажа'}</div>
        <button className="icon-btn" onClick={() => onSubmit(f)} disabled={busy}>✓</button>
      </div>

      <div className="seg">
        <button className={tab === 'main' ? 'active' : ''} onClick={() => setTab('main')}>Главное</button>
        <button className={tab === 'speech' ? 'active' : ''} onClick={() => setTab('speech')}>Манера речи</button>
      </div>

      {tab === 'main' ? (
        <div className="page">
          <div className="avatar-edit-row">
            {f.avatar
              ? <img className="big" src={f.avatar} alt="" />
              : <div className="big" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🧑</div>}
            <label className="cam-badge" title="Загрузить аватар">📷
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onAvatarFile} />
            </label>
          </div>

          <div className="field">
            <label>Имя</label>
            <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Шрек" maxLength={40} />
          </div>

          <div className="field">
            <label>Тип персонажа</label>
            <input value={f.kind} onChange={(e) => set('kind', e.target.value)} placeholder="дружелюбный орк" maxLength={60} />
          </div>

          <div className="field">
            <label>Пол</label>
            <select value={f.gender} onChange={(e) => set('gender', e.target.value)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, outline: 'none', width: '100%' }}>
              {['Мужской', 'Женский', 'Не указан'].map((g) => <option key={g} value={g} style={{ color: '#000' }}>{g}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Категория</label>
            <select value={f.category} onChange={(e) => set('category', e.target.value)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, outline: 'none', width: '100%' }}>
              {['Аниме', 'Кино', 'Игры', 'Животные', 'Психолог', 'Астролог', 'Разное'].map((c) => <option key={c} value={c} style={{ color: '#000' }}>{c}</option>)}
            </select>
          </div>

          <div className="toggle-card">
            <div>
              <div className="tt">Умеет рисовать<span className="badge-beta">Beta</span></div>
              <div className="sub">Персонаж сможет создавать картинки по твоему запросу</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={f.can_draw} onChange={(e) => set('can_draw', e.target.checked)} />
              <span className="track" /><span className="knob" />
            </label>
          </div>

          <div className="toggle-card">
            <div>
              <div className="tt">Публичный персонаж</div>
              <div className="sub">Другие пользователи смогут с ним общаться</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={f.is_public} onChange={(e) => set('is_public', e.target.checked)} />
              <span className="track" /><span className="knob" />
            </label>
          </div>

          <div className="field">
            <label>Приветственное сообщение</label>
            <textarea rows={2} value={f.greeting} onChange={(e) => set('greeting', e.target.value)} placeholder="Привет! Рад знакомству!" maxLength={300} />
          </div>
        </div>
      ) : (
        <div className="page">
          <div className="field" style={{ margin: 0 }}>
            <label>Характер и поведение</label>
            <textarea
              rows={12}
              value={f.persona}
              onChange={(e) => set('persona', e.target.value)}
              maxLength={1000}
              placeholder="Опиши, как персонаж говорит и ведёт себя. Например: «Ты дружелюбный орк. Тебе нравится проводить время со своими друзьями, особенно с Ослоом…»"
            />
            <div className="counter">{f.persona.length}/1000</div>
          </div>
          <div className="field">
            <label>Обо мне (видно в профиле персонажа)</label>
            <textarea rows={3} value={f.about} onChange={(e) => set('about', e.target.value)} maxLength={280} />
            <div className="counter">{f.about.length}/280</div>
          </div>
        </div>
      )}

      {initial && onDelete && (
        <button className="danger-link" onClick={onDelete}>🗑 Удалить персонажа</button>
      )}

      <button className="primary-btn" onClick={() => onSubmit(f)} disabled={busy}>
        {busy ? 'Сохранение…' : 'Сохранить'}
      </button>
      {err && <div className="error-toast" style={{ position: 'static', margin: '10px 16px' }}>{err}</div>}
    </div>
  );
}

export default function CreateCharacter() {
  const nav = useNavigate();
  const { api } = AuthProvider.use();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(f) {
    setBusy(true); setErr('');
    try {
      const c = await api('/api/characters', { method: 'POST', body: JSON.stringify(f) });
      nav(`/chat/${c.id}`);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return <CharacterForm onSubmit={submit} busy={busy} err={err} />;
}

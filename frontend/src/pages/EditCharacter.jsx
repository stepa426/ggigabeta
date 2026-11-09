import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { CharacterForm } from './CreateCharacter.jsx';

export default function EditCharacter() {
  const { id } = useParams();
  const nav = useNavigate();
  const { api } = AuthProvider.use();
  const [initial, setInitial] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try { setInitial(await api(`/api/characters/${id}`)); }
      catch (e) { setErr(e.message); }
    })();
  }, [id]);

  async function submit(f) {
    setBusy(true); setErr('');
    try {
      await api(`/api/characters/${id}`, { method: 'PUT', body: JSON.stringify(f) });
      nav(-1);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm('Удалить персонажа?')) return;
    try { await api(`/api/characters/${id}`, { method: 'DELETE' }); nav('/profile'); }
    catch (e) { setErr(e.message); }
  }

  if (err) return <div className="phone-wrap"><div className="header"><div className="title">Ошибка</div></div><div className="error-toast">{err}</div></div>;
  if (!initial) return <div className="phone-wrap" />;

  return <CharacterForm initial={initial} onSubmit={submit} onDelete={remove} busy={busy} err={err} />;
}

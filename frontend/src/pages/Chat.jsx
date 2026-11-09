import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

export default function Chat() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, api, refresh } = AuthProvider.use();
  const [character, setCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [rated, setRated] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api(`/api/chat/${id}`);
        setCharacter(data.character);
        setMessages(data.messages);
      } catch (e) { setErr(e.message); }
    })();
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send() {
    const t = text.trim();
    if (!t || busy) return;
    setText(''); setBusy(true); setErr('');
    const optimistic = [...messages, { role: 'user', content: t }];
    setMessages([...optimistic, { role: 'assistant', content: '', pending: true }]);
    try {
      const data = await api(`/api/chat/${id}`, { method: 'POST', body: JSON.stringify({ message: t }) });
      setMessages((prev) => [...prev.filter((m) => !m.pending), { role: 'user', content: t }, { role: 'assistant', content: data.reply }]);
      if (data.crystals != null) refresh();
    } catch (e) {
      setMessages(optimistic);
      setErr(e.data?.message || e.message);
    } finally { setBusy(false); }
  }

  async function regenerate() {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const data = await api(`/api/chat/${id}/regenerate`, { method: 'POST' });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function rate(msgIdx, up) {
    setRated((r) => ({ ...r, [msgIdx]: up ? 'up' : 'down' }));
    try { await api(`/api/chat/message/0/rate`, { method: 'POST', body: JSON.stringify({ rating: up ? 'up' : 'down' }) }); } catch {}
  }

  return (
    <div className="phone-wrap chat-page">
      <div className="header">
        <button className="icon-btn" onClick={() => nav(-1)}>←</button>
        <div className="title">{character?.name || '…'}</div>
        <button className="icon-btn">⋮</button>
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {character && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
            {character.avatar
              ? <img src={character.avatar} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface-2)' }} />}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`msg-row ${m.role === 'user' ? 'user' : 'ai'}`}>
              {m.role !== 'user' && (character?.avatar
                ? <img className="ava" src={character.avatar} alt="" />
                : <div className="ava" />)}
              <div className="bubble">
                {m.pending
                  ? <span className="typing-dots"><i /><i /><i /></span>
                  : m.content}
              </div>
            </div>
            {m.role === 'assistant' && !m.pending && m.content && (
              <div className="rate-row">
                <button className={rated[i] === 'up' ? 'on' : ''} onClick={() => rate(i, true)}>👍</button>
                <button className={rated[i] === 'down' ? 'on' : ''} onClick={() => rate(i, false)}>👎</button>
                <button onClick={regenerate}>🔄</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {busy && (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, paddingBottom: 6 }}>
          Помни, персонажи выдумывают
        </div>
      )}

      <div className="chat-input-bar">
        {!user && (
          <div className="pending-note" onClick={() => nav('/login')}>Я уже пишу свой ответ — войдите, чтобы продолжить</div>
        )}
        <div className="chat-input">
          <input
            placeholder="Сообщение"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="send-btn" onClick={send} disabled={busy || !text.trim()}>➤</button>
        </div>
        <div className="chat-hint">Помни, персонажи выдумывают</div>
      </div>

      {err && <div className="error-toast" onClick={() => setErr('')}>{err}</div>}
    </div>
  );
}

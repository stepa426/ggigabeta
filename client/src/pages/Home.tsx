import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  Edit3,
  Flame,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type Character = {
  id: string;
  name: string;
  role: string;
  description: string;
  persona: string;
  tone: string;
  accent: string;
  initials: string;
  tags: string[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const defaultCharacters: Character[] = [
  {
    id: "lea",
    name: "Лея",
    role: "Твой спокойный коуч",
    description: "Помогает услышать себя и превратить большие планы в маленькие шаги.",
    persona: "Спокойная, внимательная коуч. Задаёт короткие вопросы, не давит и помогает превращать тревогу в понятные действия.",
    tone: "Поддержка",
    accent: "lilac",
    initials: "Л",
    tags: ["фокус", "поддержка"],
  },
  {
    id: "noa",
    name: "Ноа",
    role: "Ночной собеседник",
    description: "Умеет поддержать разговор о мыслях, музыке и всём, что не отпускает перед сном.",
    persona: "Наблюдательный ночной собеседник с мягким юмором. Отвечает образно, но всегда остаётся тактичным и живым.",
    tone: "Разговор",
    accent: "blue",
    initials: "Н",
    tags: ["ночь", "истории"],
  },
  {
    id: "mira",
    name: "Мира",
    role: "Твой креативный редактор",
    description: "Собирает идеи в тексты, концепции и смелые первые версии.",
    persona: "Энергичная креативная редакторка. Любит неожиданные углы, даёт конкретные правки и помогает доводить идеи до формы.",
    tone: "Идеи",
    accent: "coral",
    initials: "М",
    tags: ["тексты", "идеи"],
  },
  {
    id: "mark",
    name: "Марк",
    role: "Партнёр для английского",
    description: "Объясняет английский легко: через диалог, примеры и живые формулировки.",
    persona: "Дружелюбный языковой партнёр. Исправляет бережно, объясняет простыми словами и подстраивает сложность под собеседника.",
    tone: "Практика",
    accent: "mint",
    initials: "М",
    tags: ["английский", "практика"],
  },
  {
    id: "sana",
    name: "Сана",
    role: "Гид по привычкам",
    description: "Помогает найти ритм без жёстких правил и чувства вины.",
    persona: "Тёплая и рациональная наставница по привычкам. Предлагает реалистичные эксперименты и уважает темп человека.",
    tone: "Ритм",
    accent: "amber",
    initials: "С",
    tags: ["ритм", "здоровье"],
  },
  {
    id: "iris",
    name: "Ирис",
    role: "Куратор любопытства",
    description: "Находит неожиданные связи между темами и превращает вопросы в исследование.",
    persona: "Любопытная кураторка знаний. Любит задавать связи и уточнения, отвечает структурно, но не сухо.",
    tone: "Знания",
    accent: "sky",
    initials: "И",
    tags: ["исследование", "культура"],
  },
];

const starterMessages: Record<string, ChatMessage[]> = {
  lea: [
    {
      role: "assistant",
      content: "Привет. Я Лея — могу помочь навести порядок в мыслях и найти следующий спокойный шаг. Что сейчас занимает больше всего места в голове?",
    },
  ],
  noa: [
    {
      role: "assistant",
      content: "Я здесь. Можно начать с одной детали сегодняшнего дня — иногда из неё вырастает весь разговор.",
    },
  ],
};

const recentChats = [
  { character: defaultCharacters[0], preview: "Про первый шаг к большому плану", time: "сегодня" },
  { character: defaultCharacters[2], preview: "Три идеи для нового проекта", time: "вчера" },
  { character: defaultCharacters[4], preview: "Как не бросить привычку", time: "вт" },
];

function CharacterPortrait({ character, small = false }: { character: Character; small?: boolean }) {
  return (
    <div className={`portrait portrait-${character.accent} ${small ? "portrait-small" : ""}`} aria-hidden="true">
      <span>{character.initials}</span>
      <i />
    </div>
  );
}

function BrandMark() {
  return <span className="brand-mark"><span /> <span /></span>;
}

export default function Home() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const chatMutation = trpc.chat.send.useMutation();
  const [activeTab, setActiveTab] = useState("Для тебя");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(starterMessages);
  const [draft, setDraft] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [phone, setPhone] = useState("");
  const [customCharacter, setCustomCharacter] = useState<Character | null>(null);
  const [newCharacter, setNewCharacter] = useState({ name: "", description: "", persona: "" });

  const allCharacters = useMemo(
    () => (customCharacter ? [customCharacter, ...defaultCharacters] : defaultCharacters),
    [customCharacter]
  );
  const categories = ["Все", "Поддержка", "Разговор", "Идеи", "Практика", "Ритм", "Знания"];
  const filteredCharacters = allCharacters.filter(character => {
    const matchesCategory = activeCategory === "Все" || character.tone === activeCategory;
    const haystack = `${character.name} ${character.role} ${character.description} ${character.tags.join(" ")}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  });
  const currentMessages = selected ? messages[selected.id] ?? [] : [];

  const openCharacter = (character: Character) => {
    setSelected(character);
    setDraft("");
    setMessages(prev => ({
      ...prev,
      [character.id]: prev[character.id] ?? [{ role: "assistant", content: `Привет. Я ${character.name}. ${character.description} С чего начнём?` }],
    }));
  };

  const handleSend = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || !selected || chatMutation.isPending) return;

    const nextMessages = [...currentMessages, { role: "user" as const, content: text }];
    setMessages(prev => ({ ...prev, [selected.id]: nextMessages }));
    setDraft("");

    try {
      const result = await chatMutation.mutateAsync({
        characterName: selected.name,
        persona: selected.persona,
        history: currentMessages,
        message: text,
      });
      setMessages(prev => ({ ...prev, [selected.id]: [...nextMessages, { role: "assistant", content: result.reply }] }));
    } catch {
      setMessages(prev => ({
        ...prev,
        [selected.id]: [...nextMessages, { role: "assistant", content: "Я услышал тебя. Давай продолжим — расскажи, что было бы для тебя хорошим следующим шагом?" }],
      }));
      toast.error("Ответ сервиса временно недоступен, но разговор можно продолжить.");
    }
  };

  const createCharacter = (event: FormEvent) => {
    event.preventDefault();
    if (!newCharacter.name.trim()) return;
    const created: Character = {
      id: `custom-${Date.now()}`,
      name: newCharacter.name.trim(),
      role: "Твой персонаж",
      description: newCharacter.description.trim() || "Персонаж, которого ты собрал сам.",
      persona: newCharacter.persona.trim() || "Любопытный, уважительный и внимательный собеседник.",
      tone: "Мои",
      accent: "lilac",
      initials: newCharacter.name.trim().slice(0, 1).toUpperCase(),
      tags: ["мой персонаж"],
    };
    setCustomCharacter(created);
    setNewCharacter({ name: "", description: "", persona: "" });
    setShowCreate(false);
    openCharacter(created);
    toast.success("Персонаж создан");
  };

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <div className="brand"><BrandMark /><span>charactera</span></div>
        <nav className="rail-nav" aria-label="Основная навигация">
          <button className={activeTab === "Для тебя" ? "rail-link active" : "rail-link"} onClick={() => { setActiveTab("Для тебя"); setShowProfile(false); }}><Compass size={18} /> <span>Для тебя</span></button>
          <button className={activeTab === "Популярное" ? "rail-link active" : "rail-link"} onClick={() => setActiveTab("Популярное")}><Flame size={18} /> <span>Популярное</span></button>
          <button className={activeTab === "Мои персонажи" ? "rail-link active" : "rail-link"} onClick={() => setActiveTab("Мои персонажи")}><Heart size={18} /> <span>Мои персонажи</span></button>
          <button className="rail-link" onClick={() => setShowProfile(true)}><UserRound size={18} /> <span>Профиль</span></button>
        </nav>
        <div className="rail-bottom">
          <button className="rail-link muted"><CircleHelp size={18} /> <span>Как это работает</span></button>
          <div className="rail-user" onClick={() => setShowProfile(true)}>
            <div className="user-avatar">{user?.name?.slice(0, 1) ?? "Г"}</div>
            <div><strong>{user?.name ?? "Гость"}</strong><small>{isAuthenticated ? "Мой профиль" : "Войти в аккаунт"}</small></div>
          </div>
        </div>
      </aside>

      <main className="main-canvas">
        <header className="topbar">
          <div className="mobile-brand"><BrandMark /><span>charactera</span></div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Справка"><CircleHelp size={18} /></button>
            <button className="profile-trigger" onClick={() => setShowProfile(true)}><span className="user-avatar">{user?.name?.slice(0, 1) ?? "Г"}</span><span className="hide-mobile">{user?.name ?? "Гость"}</span><ChevronRight size={15} /></button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="hero-block">
            <div>
              <div className="eyebrow"><Sparkles size={14} /> Пространство для своих разговоров</div>
              <h1>Выбери голос,<br /><em>который хочется услышать.</em></h1>
              <p className="hero-copy">Персонажи с характером, памятью о разговоре и своим взглядом на мир.</p>
            </div>
            <div className="hero-note"><span className="live-dot" /> Сейчас онлайн <strong>2 418</strong> персонажей</div>
          </section>

          <section className="toolbar" aria-label="Поиск и категории">
            <label className="search-box"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Найти персонажа или тему" /><kbd>⌘ K</kbd></label>
            <div className="category-row">{categories.map(category => <button key={category} onClick={() => setActiveCategory(category)} className={activeCategory === category ? "category active" : "category"}>{category}</button>)}</div>
          </section>

          <div className="section-heading"><div><span className="section-kicker">{activeTab}</span><h2>{activeTab === "Популярное" ? "Сейчас чаще всего выбирают" : activeTab === "Мои персонажи" ? "Твои собеседники" : "Персонажи для тебя"}</h2></div><button className="text-button" onClick={() => setActiveCategory("Все")}>Смотреть все <ArrowUpRight size={15} /></button></div>

          <section className="character-grid">
            {filteredCharacters.map(character => <article className="character-card" key={character.id} onClick={() => openCharacter(character)}>
              <div className="card-topline"><span className="status"><i /> в сети</span><button className="more-button" aria-label="Больше действий" onClick={event => event.stopPropagation()}><MoreHorizontal size={17} /></button></div>
              <CharacterPortrait character={character} />
              <div className="character-meta"><div><h3>{character.name}</h3><p>{character.role}</p></div><button className="round-arrow" aria-label={`Открыть ${character.name}`}><ArrowUpRight size={16} /></button></div>
              <p className="character-description">{character.description}</p>
              <div className="tag-row">{character.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>
            </article>)}
            <button className="create-card" onClick={() => setShowCreate(true)}><span className="create-icon"><Plus size={22} /></span><strong>Создать своего</strong><small>Настрой характер, стиль и правила общения</small><span className="create-link">Начать <ArrowUpRight size={14} /></span></button>
          </section>

          <section className="recent-section"><div className="section-heading compact"><div><span className="section-kicker">История</span><h2>Продолжить разговор</h2></div><button className="text-button">Вся история <ArrowUpRight size={15} /></button></div><div className="recent-list">{recentChats.map(chat => <button className="recent-item" key={chat.character.id} onClick={() => openCharacter(chat.character)}><CharacterPortrait character={chat.character} small /><span className="recent-copy"><strong>{chat.character.name}</strong><span>{chat.preview}</span></span><time>{chat.time}</time><ChevronRight size={16} /></button>)}</div></section>
        </div>

        <nav className="mobile-nav" aria-label="Мобильная навигация"><button className="active"><Compass size={19} /><span>Главная</span></button><button onClick={() => setActiveTab("Популярное")}><Flame size={19} /><span>Популярное</span></button><button onClick={() => setShowCreate(true)}><Plus size={21} /><span>Создать</span></button><button onClick={() => setShowProfile(true)}><UserRound size={19} /><span>Профиль</span></button></nav>
      </main>

      {selected && <div className="overlay chat-overlay" role="dialog" aria-modal="true"><section className="chat-panel"><header className="chat-header"><button className="icon-button" onClick={() => setSelected(null)} aria-label="Закрыть чат"><ArrowLeft size={19} /></button><div className="chat-person"><CharacterPortrait character={selected} small /><div><strong>{selected.name}</strong><span><i /> {selected.role}</span></div></div><button className="icon-button"><MoreHorizontal size={19} /></button></header><div className="chat-context"><span className="context-label">О персонаже</span><p>{selected.description}</p></div><div className="messages">{currentMessages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}><div className="message-bubble">{message.content}</div></div>)}{chatMutation.isPending && <div className="message-row assistant"><div className="message-bubble thinking"><i /><i /><i /></div></div>}</div><form className="composer" onSubmit={handleSend}><textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend(); } }} placeholder={`Напиши ${selected.name}...`} rows={1} /><button className="send-button" type="submit" disabled={!draft.trim() || chatMutation.isPending} aria-label="Отправить"><Send size={18} /></button></form><div className="composer-hint">Enter — отправить · Shift + Enter — новая строка</div></section></div>}

      {showAuth && <div className="overlay" role="dialog" aria-modal="true"><section className="modal-card auth-card"><button className="modal-close" onClick={() => setShowAuth(false)} aria-label="Закрыть"><X size={18} /></button><div className="modal-mark"><BrandMark /></div><span className="section-kicker">Твоё пространство</span><h2>Войди, чтобы продолжить.</h2><p>Сохраним разговоры, персонажей и вернём тебя туда, где ты остановился.</p><button className="google-button" onClick={() => { try { startLogin(); } catch { toast.error("OAuth ещё не настроен в проекте"); } }}><span className="google-g">G</span> Продолжить через Google</button><div className="or-divider"><span>или</span></div><label className="field-label">Номер телефона<input value={phone} onChange={event => setPhone(event.target.value)} placeholder="+7 900 000 00 00" type="tel" /></label><button className="secondary-button" disabled={!phone.trim()} onClick={() => toast.info("SMS-вход подключается после выбора SMS-провайдера.")}>Получить код по SMS</button><small className="modal-footnote">Телефон понадобится только для входа. Секреты провайдеров хранятся на сервере.</small></section></div>}

      {showCreate && <div className="overlay" role="dialog" aria-modal="true"><section className="modal-card create-modal"><button className="modal-close" onClick={() => setShowCreate(false)} aria-label="Закрыть"><X size={18} /></button><span className="section-kicker">Новый персонаж</span><h2>Собери голос под себя.</h2><p>Задай имя и интонацию — остальное можно будет уточнить в разговоре.</p><form onSubmit={createCharacter}><label className="field-label">Имя<input required value={newCharacter.name} onChange={event => setNewCharacter({ ...newCharacter, name: event.target.value })} placeholder="Например, Ая" /></label><label className="field-label">Коротко о нём<textarea value={newCharacter.description} onChange={event => setNewCharacter({ ...newCharacter, description: event.target.value })} placeholder="Кто это и чем может помочь?" rows={3} /></label><label className="field-label">Характер и правила общения<textarea value={newCharacter.persona} onChange={event => setNewCharacter({ ...newCharacter, persona: event.target.value })} placeholder="Спокойный, честный, любит задавать вопросы..." rows={3} /></label><button className="primary-button" type="submit"><Sparkles size={17} /> Создать персонажа</button></form></section></div>}

      {showProfile && <div className="overlay" role="dialog" aria-modal="true"><section className="modal-card profile-card"><button className="modal-close" onClick={() => setShowProfile(false)} aria-label="Закрыть"><X size={18} /></button><div className="profile-avatar-large">{user?.name?.slice(0, 1) ?? "Г"}</div><span className="section-kicker">Профиль</span><h2>{user?.name ?? "Гость"}</h2><p>{user?.email ?? "Войди, чтобы синхронизировать разговоры на всех устройствах."}</p>{isAuthenticated ? <button className="secondary-button" onClick={() => { void logout(); setShowProfile(false); }}>Выйти из аккаунта</button> : <button className="primary-button" onClick={() => { setShowProfile(false); setShowAuth(true); }}><UserRound size={17} /> Войти в аккаунт</button>}<div className="profile-stats"><div><strong>{customCharacter ? 1 : 0}</strong><span>создано</span></div><div><strong>{recentChats.length}</strong><span>диалога</span></div><div><strong>∞</strong><span>идей</span></div></div></section></div>}

      {!isAuthenticated && !showAuth && !loading && <button className="floating-login" onClick={() => setShowAuth(true)}><UserRound size={16} /> Войти</button>}
    </div>
  );
}

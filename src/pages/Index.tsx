import { useState, useEffect, useCallback, useRef } from "react";

const VALID_LOGINS = ["admin", "argentarius", "actuari", "edilus", "cpd", "mortum"];
const SESSION_DURATION = 60 * 60 * 1000;
const PENALTY = 15 * 60 * 1000;

const FOLDERS = [
  { id: "f1", name: "Телефоны", encrypted: "Т%#@фΩн∆" },
  { id: "f2", name: "Фотороботы", encrypted: "Ф∅т◊р◉б∇т∑" },
  { id: "f3", name: "Личные дела", encrypted: "Л!чн∑е ∂€ла" },
  { id: "f4", name: "Открытые заказы", encrypted: "Ωтк∇∑т∑е ƶ@каз∑" },
  { id: "f5", name: "Архив заказов", encrypted: "Арх!∞ ƶ@каз∑" },
  { id: "f6", name: "Архив документов", encrypted: "Арх!∞ д∅к∑м€нт∑" },
];

const FILES = [
  { id: "doc1", folderId: "f1", name: "контакты_список.txt", encrypted: "к∅нт∂кт∑_с∑@с∅к.тхт", type: "txt", content: "СПИСОК КОНТАКТОВ\n================\nАгент 001: +7 (495) 123-45-67\nАгент 002: +7 (812) 987-65-43\nАгент 003: +7 (343) 555-12-34\nКуратор: +7 (495) 000-00-01\n\nВСЕ ДАННЫЕ СТРОГО КОНФИДЕНЦИАЛЬНЫ" },
  { id: "doc2", folderId: "f1", name: "экстренная_связь.txt", encrypted: "€кст∑€нн∂я_с∞яƶь.тхт", type: "txt", content: "ЭКСТРЕННАЯ СВЯЗЬ\n================\nКодовое слово: ОРИОН\nЧастота: 156.800 МГц\nВремя выхода: 03:00 / 15:00\n\nПри компрометации — немедленное молчание" },
  { id: "doc3", folderId: "f2", name: "фоторобот_001.png", encrypted: "ф∅т∅р∅б∅т_∅∅1.пнг", type: "png", content: "[ИЗОБРАЖЕНИЕ: Мужчина, ~40 лет, рост 180 см, тёмные волосы, шрам над левой бровью. Особые приметы: татуировка на запястье в виде якоря]" },
  { id: "doc4", folderId: "f2", name: "фоторобот_002.png", encrypted: "ф∅т∅р∅б∅т_∅∅2.пнг", type: "png", content: "[ИЗОБРАЖЕНИЕ: Женщина, ~35 лет, рост 165 см, рыжие волосы. Особые приметы: родинка под правым глазом, носит очки с синей оправой]" },
  { id: "doc5", folderId: "f3", name: "личное_дело_А-117.txt", encrypted: "л!чн∅е_∂€л∅_А-117.тхт", type: "txt", content: "ЛИЧНОЕ ДЕЛО № А-117\n===================\nКодовое имя: СЕРЫЙ\nНастоящее имя: [ЗАСЕКРЕЧЕНО]\nДата рождения: [ЗАСЕКРЕЧЕНО]\nСпециализация: Наружное наблюдение\nСтатус: АКТИВЕН\nУровень допуска: 3" },
  { id: "doc6", folderId: "f3", name: "личное_дело_Б-223.txt", encrypted: "л!чн∅е_∂€л∅_Б-223.тхт", type: "txt", content: "ЛИЧНОЕ ДЕЛО № Б-223\n===================\nКодовое имя: ТЕНЬ\nНастоящее имя: [ЗАСЕКРЕЧЕНО]\nДата рождения: [ЗАСЕКРЕЧЕНО]\nСпециализация: Технические операции\nСтатус: В РЕЗЕРВЕ\nУровень допуска: 4" },
  { id: "doc7", folderId: "f4", name: "заказ_ОП-441.txt", encrypted: "ƶ@к∂ƶ_∅П-441.тхт", type: "txt", content: "ОТКРЫТЫЙ ЗАКАЗ № ОП-441\n=======================\nЗаказчик: [ЗАШИФРОВАНО]\nОбъект: Физическое лицо, муж., 52 года\nЗадача: Документирование контактов\nСрок: 30 суток\nСтатус: В РАБОТЕ\nПриоритет: ВЫСОКИЙ" },
  { id: "doc8", folderId: "f5", name: "архив_2019_ОП-112.txt", encrypted: "∂рх!∞_2019_∅П-112.тхт", type: "txt", content: "АРХИВНЫЙ ЗАКАЗ № ОП-112 (2019)\n==============================\nСтатус: ЗАВЕРШЁН\nРезультат: ВЫПОЛНЕН\nДата закрытия: [ЗАСЕКРЕЧЕНО]\nМатериалы: 47 страниц, 12 фотографий\nМесто хранения: СЕЙФ-7" },
  { id: "doc9", folderId: "f6", name: "инструкция_безопасности.txt", encrypted: "!нстр∑кц!∞_б€ƶ∅п∂сн∅ст!.тхт", type: "txt", content: "ИНСТРУКЦИЯ ПО БЕЗОПАСНОСТИ\n==========================\n1. Никогда не разглашать кодовые слова\n2. Сеансы связи — только в назначенное время\n3. Документы не покидают защищённый контур\n4. При угрозе — протокол МОЛЧАНИЕ\n5. Проверка на слежку обязательна" },
];

const RIDDLES = [
  { id: 1, question: "Чем больше берёшь — тем больше становится. Что это?", answer: "яма" },
  { id: 2, question: "Всегда идёт, а с места не сдвигается. Что это?", answer: "время" },
  { id: 3, question: "У меня есть города без домов, горы без деревьев, вода без рыбы. Что я такое?", answer: "карта" },
  { id: 4, question: "Чем больше сохнет — тем мокрее. Что это?", answer: "полотенце" },
  { id: 5, question: "Говорит без рта, слышит без ушей. Что это?", answer: "эхо" },
  { id: 6, question: "Днём спит, ночью летает и прохожих пугает. Что это?", answer: "летучая мышь" },
  { id: 7, question: "Без окон, без дверей — полна горница людей. Что это?", answer: "огурец" },
  { id: 8, question: "Что можно поймать, но нельзя увидеть?", answer: "простуда" },
];

type HistoryEvent = {
  time: Date;
  user: string;
  type: "login" | "action" | "decrypt_ok" | "decrypt_fail" | "session_expired" | "logout";
  description: string;
};

type AppState = "login" | "main" | "expired";
type ActiveTab = "files" | "history" | "help";

const btn = (extra = "") =>
  `border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] bg-[#c0c0c0] text-black px-3 py-1 text-xs font-mono cursor-pointer active:border-t-[#808080] active:border-l-[#808080] active:border-b-white active:border-r-white select-none hover:bg-[#d4d0c8] ${extra}`;

const inset = (extra = "") =>
  `border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white ${extra}`;

export default function Index() {
  const [appState, setAppState] = useState<AppState>("login");
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [sessionExpiry, setSessionExpiry] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [decrypted, setDecrypted] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("files");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDecrypted, setFileDecrypted] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [showRiddleDialog, setShowRiddleDialog] = useState(false);
  const [riddleContext, setRiddleContext] = useState<"files" | "file">("files");
  const [currentRiddle, setCurrentRiddle] = useState(RIDDLES[0]);
  const [riddleAnswer, setRiddleAnswer] = useState("");
  const [riddleError, setRiddleError] = useState("");
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const timerRef = useRef<number | null>(null);

  const addHistory = useCallback((user: string, type: HistoryEvent["type"], description: string) => {
    setHistory(prev => [{ time: new Date(), user, type, description }, ...prev]);
  }, []);

  useEffect(() => {
    if (appState !== "main") return;
    timerRef.current = window.setInterval(() => {
      const left = sessionExpiry - Date.now();
      if (left <= 0) {
        setTimeLeft(0);
        setShowExpiredDialog(true);
        addHistory(currentUser, "session_expired", "Сессия истекла автоматически");
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setTimeLeft(left);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [appState, sessionExpiry, currentUser, addHistory]);

  const handleLogin = () => {
    const login = loginInput.trim().toLowerCase();
    if (!VALID_LOGINS.includes(login)) {
      setLoginError("Неверный логин. Доступ запрещён.");
      return;
    }
    const expiry = Date.now() + SESSION_DURATION;
    setCurrentUser(login);
    setSessionExpiry(expiry);
    setTimeLeft(SESSION_DURATION);
    setAppState("main");
    setLoginError("");
    addHistory(login, "login", "Вход в систему выполнен");
  };

  const handleLogout = () => {
    addHistory(currentUser, "logout", "Выход из системы");
    if (timerRef.current) clearInterval(timerRef.current);
    setAppState("login");
    setCurrentUser("");
    setDecrypted(false);
    setFileDecrypted(false);
    setSelectedFile(null);
    setSelectedFolder(null);
    setLoginInput("");
    setShowExpiredDialog(false);
  };

  const openRiddle = (context: "files" | "file") => {
    const r = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
    setCurrentRiddle(r);
    setRiddleContext(context);
    setRiddleAnswer("");
    setRiddleError("");
    setShowRiddleDialog(true);
    addHistory(currentUser, "action", `Запрос расшифровки: ${context === "files" ? "список файлов" : "документ"}`);
  };

  const handleRiddleSubmit = () => {
    const ans = riddleAnswer.trim().toLowerCase();
    const correct = currentRiddle.answer.toLowerCase();
    if (ans === correct) {
      if (riddleContext === "files") {
        setDecrypted(true);
        addHistory(currentUser, "decrypt_ok", "Список файлов расшифрован — верный ответ");
      } else {
        setFileDecrypted(true);
        addHistory(currentUser, "decrypt_ok", "Документ расшифрован — верный ответ");
      }
      setShowRiddleDialog(false);
    } else {
      setSessionExpiry(prev => prev - PENALTY);
      setRiddleError("Неверно! Снято 15 минут сессии.");
      addHistory(currentUser, "decrypt_fail", "Неверный ответ на загадку — штраф 15 минут");
    }
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00:00";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const selectedFileData = FILES.find(f => f.id === selectedFile);

  const toggleFolder = (fid: string) => {
    const folder = FOLDERS.find(f => f.id === fid);
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(fid)) { next.delete(fid); } else { next.add(fid); }
      return next;
    });
    setSelectedFolder(fid);
    addHistory(currentUser, "action", `Открыта папка: ${decrypted ? folder?.name : folder?.encrypted}`);
  };

  const handleFileClick = (fileId: string) => {
    const file = FILES.find(f => f.id === fileId);
    setSelectedFile(fileId);
    setFileDecrypted(false);
    addHistory(currentUser, "action", `Открыт файл: ${decrypted ? file?.name : file?.encrypted}`);
  };

  const encryptedContent = () => {
    const chars = "∅∑€∂∇◊Ω∞ƶ!@#%^∆Ψ∏∐∫≈≠±§¶";
    return Array.from({ length: 14 }, () =>
      Array.from({ length: 38 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    ).join("\n");
  };

  if (appState === "login") {
    return (
      <div className="w-screen h-screen bg-[#008080] flex items-center justify-center" style={{ fontFamily: "'Courier New', monospace" }}>
        <div className="bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] w-80 shadow-[4px_4px_8px_rgba(0,0,0,0.5)]">
          <div className="bg-[#000080] px-2 py-1 flex items-center justify-between select-none">
            <div className="flex items-center gap-1">
              <span className="text-sm">🔐</span>
              <span className="text-white text-xs font-bold">SecureFS 2.0 — Авторизация</span>
            </div>
            <div className={`${btn("text-[10px] px-1.5 py-0 h-4 flex items-center")}`}>✕</div>
          </div>
          <div className="p-5 space-y-4">
            <div className={`${inset("p-4 text-center")}`}>
              <div className="text-5xl mb-2">🖥</div>
              <div className="text-xs text-[#000080] font-bold tracking-widest">ЗАКРЫТАЯ СИСТЕМА</div>
              <div className="text-[10px] text-[#808080] mt-1">Доступ только для авторизованных лиц</div>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Идентификатор пользователя:</label>
              <input
                className="w-full border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1.5 text-xs outline-none"
                style={{ fontFamily: "'Courier New', monospace" }}
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="введите логин..."
                autoFocus
              />
            </div>
            {loginError && (
              <div className="text-red-800 text-[10px] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-[#fff0f0] px-2 py-1 flex items-center gap-1">
                <span>⚠</span> {loginError}
              </div>
            )}
            <div className="flex gap-2 justify-center pt-1">
              <button className={btn("px-8")} onClick={handleLogin}>ОК</button>
              <button className={btn("px-4")} onClick={() => { setLoginInput(""); setLoginError(""); }}>Очистить</button>
            </div>
            <div className="text-[9px] text-center text-[#808080] border-t border-[#c0c0c0] pt-2">
              SecureFS v2.0 © 1997 — Все права защищены
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#008080]" style={{ fontFamily: "'Courier New', monospace" }}>

      {/* Title bar */}
      <div className="bg-[#000080] px-2 py-1 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="text-sm">🗂</span>
          <span className="text-white text-xs font-bold">SecureFS 2.0 — Файловый менеджер</span>
          <span className="text-[#8080ff] text-[10px] ml-3">
            Сеанс: <b className="text-yellow-300">{currentUser}</b>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-[10px] px-2 py-0.5 font-bold border ${timeLeft < 10 * 60 * 1000 ? "bg-red-800 text-white border-red-600 animate-pulse" : "bg-[#000060] text-[#00ff00] border-[#0000a0]"}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
          <button className={btn("text-[10px] px-3")} onClick={handleLogout}>Выход</button>
        </div>
      </div>

      {/* Menu bar */}
      <div className="bg-[#c0c0c0] border-b-2 border-b-[#808080] border-t border-t-white px-1 py-0.5 flex gap-0.5 shrink-0 select-none">
        {([
          { id: "files", label: "📁 Файлы" },
          { id: "history", label: "📋 История" },
          { id: "help", label: "❓ Справка" },
        ] as { id: ActiveTab; label: string }[]).map(tab => (
          <button
            key={tab.id}
            className={`text-xs px-3 py-0.5 ${activeTab === tab.id ? "bg-[#000080] text-white" : "hover:bg-[#d4d0c8] text-black"}`}
            onClick={() => {
              setActiveTab(tab.id);
              addHistory(currentUser, "action", `Раздел: ${tab.label.replace(/^.{2}/, "").trim()}`);
            }}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[10px] text-[#404040] self-center pr-2 font-bold">
          {decrypted ? "🔓 РАСШИФРОВАНО" : "🔒 ЗАШИФРОВАНО"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden p-2 gap-2">

        {activeTab === "files" && (
          <>
            {/* Left: file tree */}
            <div className="flex flex-col w-72 shrink-0">
              <div className="bg-[#000080] px-2 py-0.5 text-white text-[10px] font-bold flex items-center gap-1 select-none">
                📁 Структура файлов
              </div>
              <div className={`${inset()} flex-1 overflow-auto`}>
                {FOLDERS.map(folder => (
                  <div key={folder.id}>
                    <div
                      className={`flex items-center gap-1.5 px-2 py-0.5 cursor-pointer text-xs select-none ${selectedFolder === folder.id && !expandedFolders.has(folder.id) ? "bg-[#000080] text-white" : "hover:bg-[#000080] hover:text-white text-black"}`}
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <span className="text-sm leading-none">{expandedFolders.has(folder.id) ? "📂" : "📁"}</span>
                      <span className={decrypted ? "text-black" : "text-[#800000] font-bold"}>
                        {decrypted ? folder.name : folder.encrypted}
                      </span>
                    </div>
                    {expandedFolders.has(folder.id) && FILES.filter(f => f.folderId === folder.id).map(file => (
                      <div
                        key={file.id}
                        className={`flex items-center gap-1.5 pl-7 pr-2 py-0.5 cursor-pointer text-xs select-none ${selectedFile === file.id ? "bg-[#000080] text-white" : "hover:bg-[#000080] hover:text-white text-black"}`}
                        onClick={() => handleFileClick(file.id)}
                      >
                        <span className="text-sm leading-none">{file.type === "png" ? "🖼" : "📄"}</span>
                        <span className={decrypted ? "" : "text-[#800000] font-bold"}>
                          {decrypted ? file.name : file.encrypted}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="bg-[#c0c0c0] border-t-2 border-t-white p-2">
                {decrypted ? (
                  <button
                    className={btn("w-full justify-center")}
                    onClick={() => { setDecrypted(false); setFileDecrypted(false); addHistory(currentUser, "action", "Список зашифрован вручную"); }}
                  >
                    🔒 Зашифровать
                  </button>
                ) : (
                  <button className={btn("w-full justify-center")} onClick={() => openRiddle("files")}>
                    🔓 Расшифровать
                  </button>
                )}
              </div>
            </div>

            {/* Right: document viewer */}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="bg-[#000080] px-2 py-0.5 text-white text-[10px] font-bold flex items-center gap-1 select-none">
                📄 {selectedFileData
                  ? (fileDecrypted ? selectedFileData.name : selectedFileData.encrypted)
                  : "— нет выбранного файла —"}
              </div>
              <div className={`${inset()} flex-1 overflow-auto p-3`}>
                {!selectedFileData ? (
                  <div className="text-[#808080] text-xs text-center mt-10">
                    <div className="text-5xl mb-3">📂</div>
                    <div>Выберите файл в левой панели</div>
                    <div className="text-[10px] mt-1 text-[#a0a0a0]">для просмотра содержимого</div>
                  </div>
                ) : !fileDecrypted ? (
                  <pre className="text-xs text-[#800000] leading-5 whitespace-pre-wrap break-all font-mono">
{`[ЗАШИФРОВАННЫЙ ДОКУМЕНТ]\n${"─".repeat(34)}\n\n${encryptedContent()}\n\n${"─".repeat(34)}\n[ТРЕБУЕТСЯ РАСШИФРОВКА]`}
                  </pre>
                ) : (
                  <pre className="text-xs leading-5 whitespace-pre-wrap text-black font-mono">
                    {selectedFileData.type === "png" ? (
                      `[ИЗОБРАЖЕНИЕ]\n${"─".repeat(34)}\n\n${selectedFileData.content}`
                    ) : selectedFileData.content}
                  </pre>
                )}
              </div>
              <div className="bg-[#c0c0c0] border-t-2 border-t-white p-2 flex items-center gap-2">
                {selectedFileData && (
                  fileDecrypted ? (
                    <button className={btn()} onClick={() => { setFileDecrypted(false); addHistory(currentUser, "action", `Документ зашифрован: ${selectedFileData.name}`); }}>
                      🔒 Зашифровать
                    </button>
                  ) : (
                    <button className={btn()} onClick={() => openRiddle("file")}>
                      🔓 Расшифровать документ
                    </button>
                  )
                )}
                <div className="ml-auto text-[10px] text-[#808080]">
                  {selectedFileData ? `Формат: .${selectedFileData.type.toUpperCase()} | ${selectedFileData.folderId}` : "Готово"}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "history" && (
          <div className="flex-1 flex flex-col">
            <div className="bg-[#000080] px-2 py-0.5 text-white text-[10px] font-bold select-none">
              📋 Журнал событий системы
            </div>
            <div className={`${inset()} flex-1 overflow-auto`}>
              {history.length === 0 ? (
                <div className="text-[#808080] text-xs p-4">Журнал пуст</div>
              ) : (
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[#c0c0c0]">
                      {["Время", "Пользователь", "Событие", "Описание"].map(h => (
                        <th key={h} className="text-left px-2 py-1 border-b-2 border-b-[#808080] border-r border-r-[#d0d0d0] font-bold text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((ev, i) => (
                      <tr key={i} className={`border-b border-[#e0e0e0] ${i % 2 === 0 ? "bg-white" : "bg-[#f8f8f8]"}`}>
                        <td className="px-2 py-0.5 text-[#808080] border-r border-[#e0e0e0] whitespace-nowrap text-[10px]">
                          {ev.time.toLocaleTimeString("ru-RU")}
                        </td>
                        <td className="px-2 py-0.5 border-r border-[#e0e0e0] text-[#000080] font-bold text-[10px]">{ev.user}</td>
                        <td className="px-2 py-0.5 border-r border-[#e0e0e0]">
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold ${
                            ev.type === "login" ? "bg-green-100 text-green-800 border border-green-300" :
                            ev.type === "logout" ? "bg-gray-200 text-gray-700 border border-gray-300" :
                            ev.type === "decrypt_ok" ? "bg-blue-100 text-blue-800 border border-blue-300" :
                            ev.type === "decrypt_fail" ? "bg-red-100 text-red-800 border border-red-300" :
                            ev.type === "session_expired" ? "bg-red-200 text-red-900 border border-red-400" :
                            "bg-[#e8e8e8] text-[#404040] border border-[#c0c0c0]"
                          }`}>
                            {ev.type === "login" ? "ВХОД" :
                             ev.type === "logout" ? "ВЫХОД" :
                             ev.type === "decrypt_ok" ? "РАСШ. ✓" :
                             ev.type === "decrypt_fail" ? "РАСШ. ✗" :
                             ev.type === "session_expired" ? "ИСТЕЧЕНИЕ" :
                             "ДЕЙСТВИЕ"}
                          </span>
                        </td>
                        <td className="px-2 py-0.5 text-[10px]">{ev.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="bg-[#c0c0c0] border-t-2 border-t-white p-2 flex justify-between items-center">
              <span className="text-[10px] text-[#808080]">Всего записей: {history.length}</span>
              <button className={btn()} onClick={() => { setHistory([]); }}>Очистить журнал</button>
            </div>
          </div>
        )}

        {activeTab === "help" && (
          <div className="flex-1 flex flex-col">
            <div className="bg-[#000080] px-2 py-0.5 text-white text-[10px] font-bold select-none">
              ❓ Справочная система SecureFS
            </div>
            <div className={`${inset()} flex-1 overflow-auto p-4`}>
              <div className="text-xs space-y-4 font-mono max-w-2xl">
                <div>
                  <div className="font-bold text-[#000080] text-sm mb-0.5">SecureFS 2.0 — Руководство пользователя</div>
                  <div className="text-[10px] text-[#808080]">Редакция 2.0.1 © 1997 — Для служебного пользования</div>
                  <div className="border-b-2 border-b-[#808080] mt-2 mb-3" />
                </div>
                {[
                  { icon: "🔐", title: "Авторизация", text: "Введите ваш логин для входа в систему. Пароль не требуется. После входа начинается защищённая сессия длительностью 60 минут." },
                  { icon: "⏱", title: "Управление сессией", text: "Таймер сессии отображается в правом верхнем углу. Неверные ответы на загадки снимают 15 минут. По истечении времени система блокируется автоматически." },
                  { icon: "📁", title: "Файловый менеджер", text: "Левая панель содержит папки и файлы. Нажмите на папку для раскрытия содержимого. Нажмите на файл для просмотра в правой панели." },
                  { icon: "🔒", title: "Шифрование данных", text: "Все имена файлов и содержимое документов зашифрованы. Для просмотра используйте кнопку «Расшифровать» в нижней части каждой панели." },
                  { icon: "🧩", title: "Система загадок", text: "При расшифровке система задаёт контрольную загадку. Правильный ответ открывает данные. Неверный ответ — штраф 15 минут от сессии. Ответ вводится строчными буквами." },
                  { icon: "📋", title: "Журнал событий", text: "В разделе «История» хранится полный журнал всех действий: входы, открытия файлов, успешные и неуспешные попытки расшифровки." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 border-l-4 border-[#000080] pl-3">
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <div>
                      <div className="font-bold text-[#000080]">{item.title}</div>
                      <div className="text-[11px] text-[#404040] mt-0.5 leading-4">{item.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-[#c0c0c0] border-t-2 border-t-white flex items-center px-2 py-0.5 gap-2 shrink-0 select-none">
        <div className={inset("px-2 text-[10px] text-[#404040] py-0.5 mr-1")}>
          Объектов: {selectedFolder ? FILES.filter(f => f.folderId === selectedFolder).length : 0}
        </div>
        <div className={inset("px-2 text-[10px] text-[#404040] py-0.5")}>
          {decrypted ? "🔓 Расшифровка активна" : "🔒 Данные зашифрованы"}
        </div>
        <div className="flex-1" />
        <div className={inset("px-2 text-[10px] text-[#000080] font-bold py-0.5")}>
          SecureFS v2.0 © 1997
        </div>
      </div>

      {/* Riddle dialog */}
      {showRiddleDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] w-96 shadow-[6px_6px_12px_rgba(0,0,0,0.6)]">
            <div className="bg-[#000080] px-2 py-1 flex items-center justify-between select-none">
              <span className="text-white text-xs font-bold">🧩 Система верификации личности</span>
              <button className={btn("text-[10px] px-1.5 py-0 h-4 flex items-center")} onClick={() => setShowRiddleDialog(false)}>✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className={inset("p-3 bg-[#fffff8]")}>
                <div className="text-[10px] text-[#808080] mb-1.5 font-bold">КОНТРОЛЬНЫЙ ВОПРОС:</div>
                <div className="text-xs text-[#000080] leading-5 font-bold">{currentRiddle.question}</div>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Ваш ответ:</label>
                <input
                  className="w-full border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1.5 text-xs outline-none font-mono"
                  value={riddleAnswer}
                  onChange={e => setRiddleAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleRiddleSubmit(); }}
                  placeholder="введите ответ строчными буквами..."
                  autoFocus
                />
              </div>
              {riddleError && (
                <div className="text-red-800 text-[10px] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-[#fff0f0] px-2 py-1.5 flex items-center gap-1">
                  <span className="text-base">⚠</span> {riddleError}
                </div>
              )}
              <div className="text-[9px] text-[#808080] border-t border-[#c0c0c0] pt-2">
                Внимание: неверный ответ снимает 15 минут от времени сессии
              </div>
              <div className="flex gap-2 justify-center">
                <button className={btn("px-8")} onClick={handleRiddleSubmit}>Подтвердить</button>
                <button className={btn("px-4")} onClick={() => setShowRiddleDialog(false)}>Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session expired dialog */}
      {showExpiredDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] w-80 shadow-[6px_6px_12px_rgba(0,0,0,0.8)]">
            <div className="bg-[#800000] px-2 py-1 flex items-center gap-1 select-none">
              <span className="text-white text-xs font-bold">⛔ Критическое предупреждение системы</span>
            </div>
            <div className="p-5 space-y-3">
              <div className={inset("p-4 text-center")}>
                <div className="text-5xl mb-2">⏱</div>
                <div className="text-sm font-bold text-red-800 tracking-widest">СЕССИЯ ИСТЕКЛА</div>
                <div className="text-xs text-[#404040] mt-2 leading-4">
                  Время защищённой сессии исчерпано.<br />
                  Все данные заблокированы.<br />
                  Для продолжения работы необходим повторный вход.
                </div>
              </div>
              <button
                className={btn("w-full text-center justify-center")}
                onClick={handleLogout}
              >
                Вернуться к авторизации
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
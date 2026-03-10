import { useState, useEffect, useCallback, useRef } from "react";

const VALID_LOGINS = ["admin", "argentarius", "actuari", "edilus", "cpd", "mortum"];
const ADMIN_LOGIN = "admin";
const SESSION_DURATION = 60 * 60 * 1000;
const PENALTY = 15 * 60 * 1000;

const RIDDLES_URL = "https://functions.poehali.dev/fb6212ce-7863-4f5a-9bca-f2f628978fd2";
const DOCUMENTS_URL = "https://functions.poehali.dev/69fbae1c-db1f-49dc-a39c-63ccc8caba63";

const FOLDERS = [
  { id: "f1", name: "Телефоны", encrypted: "7Ξq∄#∅⊗nΨ2" },
  { id: "f2", name: "Фотороботы", encrypted: "∀β9⊕Δ∇⌀Ωr∑" },
  { id: "f3", name: "Личные дела", encrypted: "ℵ∐Λ4⊘∬Π⌂∯z" },
  { id: "f4", name: "Открытые заказы", encrypted: "Ξ∮⊞8ℜ∱⌁∰Φ∄k" },
  { id: "f5", name: "Архив заказов", encrypted: "⊗∂ℑΘ∇∁6⊛Γ⌀" },
  { id: "f6", name: "Архив документов", encrypted: "∯∬Σ⊕ℵΛ∮⊘∄Ξ" },
];

type HistoryEvent = {
  time: Date;
  user: string;
  type: "login" | "action" | "decrypt_ok" | "decrypt_fail" | "session_expired" | "logout";
  description: string;
};

type AppState = "login" | "main" | "expired";
type ActiveTab = "files" | "history" | "help" | "admin";

type Riddle = { id: number; question: string; answer: string; created_at?: string };
type DbDocument = { id: number; folder_id: string; name: string; encrypted_name: string; file_type: string; created_at?: string; cdn_url?: string; fake_cdn_url?: string };

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
  const [currentRiddle, setCurrentRiddle] = useState<Riddle>({ id: 0, question: "", answer: "" });
  const [riddleAnswer, setRiddleAnswer] = useState("");
  const [riddleError, setRiddleError] = useState("");
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const timerRef = useRef<number | null>(null);

  // DB riddles & documents
  const [dbRiddles, setDbRiddles] = useState<Riddle[]>([]);
  const [dbDocuments, setDbDocuments] = useState<DbDocument[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  // Admin state
  const [adminTab, setAdminTab] = useState<"riddles" | "docs">("riddles");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const [uploadFolder, setUploadFolder] = useState("f1");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileData, setUploadFileData] = useState<string | null>(null);
  const [uploadFileType, setUploadFileType] = useState("txt");
  const [fakeFileName, setFakeFileName] = useState("");
  const [fakeFileData, setFakeFileData] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const addHistory = useCallback((user: string, type: HistoryEvent["type"], description: string) => {
    setHistory(prev => [{ time: new Date(), user, type, description }, ...prev]);
  }, []);

  const loadRiddles = async () => {
    try {
      const r = await fetch(RIDDLES_URL);
      const data = await r.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      setDbRiddles(parsed.riddles || []);
    } catch (_e) { setDbRiddles([]); }
  };

  const loadDocuments = async () => {
    try {
      const r = await fetch(DOCUMENTS_URL);
      const data = await r.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      setDbDocuments(parsed.documents || []);
    } catch (_e) { setDbDocuments([]); }
  };

  useEffect(() => {
    if (appState === "main") {
      loadRiddles();
      loadDocuments();
    }
  }, [appState]);

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
    setDbRiddles([]);
    setDbDocuments([]);
  };

  const openRiddle = (context: "files" | "file") => {
    const allRiddles = dbRiddles.length > 0 ? dbRiddles : [
      { id: 0, question: "Всегда идёт, а с места не сдвигается. Что это?", answer: "время" }
    ];
    const r = allRiddles[Math.floor(Math.random() * allRiddles.length)];
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

  const allFiles = [
    ...dbDocuments.map(d => ({
      id: `db_${d.id}`,
      folderId: d.folder_id,
      name: d.name,
      encrypted: d.encrypted_name,
      type: d.file_type,
      content: "",
      isDb: true,
      dbId: d.id,
      cdnUrl: d.cdn_url || null,
      fakeCdnUrl: d.fake_cdn_url || null,
    }))
  ];

  const selectedFileData = allFiles.find(f => f.id === selectedFile);

  const loadDbFileContent = async (dbId: number) => {
    const key = `db_${dbId}`;
    if (fileContents[key] !== undefined) return;
    try {
      const r = await fetch(`${DOCUMENTS_URL}?action=content&id=${dbId}`);
      const data = await r.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed.type && parsed.type !== "txt") {
        // image: store JSON with cdn_url and fake_txt_content
        setFileContents(prev => ({ ...prev, [key]: JSON.stringify({ _image: true, cdn_url: parsed.cdn_url, fake_txt_content: parsed.fake_txt_content ?? null, type: parsed.type }) }));
      } else {
        setFileContents(prev => ({ ...prev, [key]: parsed.content || "[Ошибка загрузки]" }));
      }
    } catch {
      setFileContents(prev => ({ ...prev, [key]: "[Ошибка загрузки содержимого]" }));
    }
  };

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
    const file = allFiles.find(f => f.id === fileId);
    setSelectedFile(fileId);
    setFileDecrypted(false);
    if (file?.isDb && file.dbId) {
      loadDbFileContent(file.dbId);
    }
    addHistory(currentUser, "action", `Открыт файл: ${decrypted ? file?.name : file?.encrypted}`);
  };

  const encryptedContent = () => {
    const chars = "∅∑€∂∇◊Ω∞ƶ!@#%^∆Ψ∏∐∫≈≠±";
    return Array.from({ length: 14 }, () =>
      Array.from({ length: 38 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    ).join("\n");
  };

  // Admin: add riddle
  const handleAddRiddle = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) { setAdminMsg("Заполните вопрос и ответ"); return; }
    setAdminMsg("Сохраняю...");
    try {
      const r = await fetch(RIDDLES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQuestion.trim(), answer: newAnswer.trim() }),
      });
      const data = await r.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed.id) {
        setAdminMsg("Загадка добавлена!");
        setNewQuestion("");
        setNewAnswer("");
        loadRiddles();
      } else {
        setAdminMsg("Ошибка: " + (parsed.error || "неизвестно"));
      }
    } catch { setAdminMsg("Ошибка соединения"); }
  };

  // Admin: delete riddle
  const handleDeleteRiddle = async (id: number) => {
    setAdminMsg("Удаляю...");
    try {
      await fetch(`${RIDDLES_URL}?id=${id}`, { method: "DELETE" });
      setAdminMsg("Загадка удалена");
      loadRiddles();
    } catch { setAdminMsg("Ошибка удаления"); }
  };

  // Admin: upload file
  const readFileAsB64 = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(((ev.target?.result as string) || "").split(",")[1]);
      reader.readAsDataURL(file);
    });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
    const isImg = ext === "png" || ext === "jpg" || ext === "jpeg";
    setUploadFileType(isImg ? ext : "txt");
    setUploadFileName(file.name);
    const b64 = await readFileAsB64(file);
    setUploadFileData(b64);
  };

  const handleFakeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFakeFileName(file.name);
    const b64 = await readFileAsB64(file);
    setFakeFileData(b64);
  };

  const handleUpload = async () => {
    if (!uploadFileData || !uploadFileName) { setAdminMsg("Выберите файл"); return; }
    setUploading(true);
    setAdminMsg("Загружаю...");
    try {
      const r = await fetch(DOCUMENTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder_id: uploadFolder,
          name: uploadFileName,
          file_type: uploadFileType,
          file_data: uploadFileData,
          ...(fakeFileData ? { fake_file_data: fakeFileData } : {}),
        }),
      });
      const data = await r.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed.id) {
        setAdminMsg(`Файл "${uploadFileName}" загружен!`);
        setUploadFileName("");
        setUploadFileData(null);
        setFakeFileName("");
        setFakeFileData(null);
        loadDocuments();
      } else {
        setAdminMsg("Ошибка: " + (parsed.error || "неизвестно"));
      }
    } catch { setAdminMsg("Ошибка загрузки"); }
    setUploading(false);
  };

  // Admin: delete document
  const handleDeleteDoc = async (id: number, name: string) => {
    setAdminMsg("Удаляю...");
    try {
      await fetch(`${DOCUMENTS_URL}?id=${id}`, { method: "DELETE" });
      setAdminMsg(`Документ "${name}" удалён`);
      setFileContents(prev => { const n = { ...prev }; delete n[`db_${id}`]; return n; });
      if (selectedFile === `db_${id}`) { setSelectedFile(null); setFileDecrypted(false); }
      loadDocuments();
    } catch { setAdminMsg("Ошибка удаления"); }
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
            <div className={btn("text-[10px] px-1.5 py-0 h-4 flex items-center")}>✕</div>
          </div>
          <div className="p-5 space-y-4">
            <div className={inset("p-4 text-center")}>
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

  const isAdmin = currentUser === ADMIN_LOGIN;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#008080]" style={{ fontFamily: "'Courier New', monospace" }}>
      {/* Title bar */}
      <div className="bg-[#000080] px-2 py-1 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="text-sm">🗂</span>
          <span className="text-white text-xs font-bold">SecureFS 2.0 — Файловый менеджер</span>
          <span className="text-[#8080ff] text-[10px] ml-3">
            Сеанс: <b className="text-yellow-300">{currentUser}</b>
            {isAdmin && <span className="ml-1 text-orange-300 font-bold">[АДМИНИСТРАТОР]</span>}
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
          ...(isAdmin ? [{ id: "admin", label: "⚙ Администратор" }] : []),
        ] as { id: ActiveTab; label: string }[]).map(tab => (
          <button
            key={tab.id}
            className={`text-xs px-3 py-0.5 ${activeTab === tab.id ? "bg-[#000080] text-white" : tab.id === "admin" ? "text-[#800000] font-bold hover:bg-[#d4d0c8]" : "hover:bg-[#d4d0c8] text-black"}`}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "admin") { loadRiddles(); loadDocuments(); setAdminMsg(""); }
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
              <div className={inset() + " flex-1 overflow-auto"}>
                {FOLDERS.map(folder => (
                  <div key={folder.id}>
                    <div
                      className={`flex items-center gap-1.5 px-2 py-0.5 cursor-pointer text-xs select-none ${selectedFolder === folder.id && !expandedFolders.has(folder.id) ? "bg-[#000080] text-white" : "hover:bg-[#000080] hover:text-white text-black"}`}
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <span className="text-sm leading-none">{expandedFolders.has(folder.id) ? "📂" : "📁"}</span>
                      <span className={decrypted ? "" : "text-[#800000] font-bold"}>
                        {decrypted ? folder.name : folder.encrypted}
                      </span>
                    </div>
                    {expandedFolders.has(folder.id) && allFiles.filter(f => f.folderId === folder.id).map(file => (
                      <div
                        key={file.id}
                        className={`flex items-center gap-1.5 pl-7 pr-2 py-0.5 cursor-pointer text-xs select-none ${selectedFile === file.id ? "bg-[#000080] text-white" : "hover:bg-[#000080] hover:text-white text-black"}`}
                        onClick={() => handleFileClick(file.id)}
                      >
                        <span className="text-sm leading-none">{file.type === "png" ? "🖼" : "📄"}</span>
                        <span className={decrypted ? "" : "text-[#800000] font-bold"}>
                          {decrypted ? file.name : file.encrypted}
                        </span>
                        {file.isDb && decrypted && <span className="text-[8px] text-green-700 ml-auto">★</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="bg-[#c0c0c0] border-t-2 border-t-white p-2">
                {decrypted ? (
                  <button className={btn("w-full justify-center")} onClick={() => { setDecrypted(false); setFileDecrypted(false); addHistory(currentUser, "action", "Список зашифрован вручную"); }}>
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
              <div className={inset() + " flex-1 overflow-auto p-3"}>
                {!selectedFileData ? (
                  <div className="text-[#808080] text-xs text-center mt-10">
                    <div className="text-5xl mb-3">📂</div>
                    <div>Выберите файл в левой панели</div>
                    <div className="text-[10px] mt-1 text-[#a0a0a0]">для просмотра содержимого</div>
                  </div>
                ) : (() => {
                  const isImage = ["png", "jpg", "jpeg"].includes(selectedFileData.type);
                  const rawContent = fileContents[selectedFileData.id] ?? null;
                  const imageData = rawContent ? (() => { try { const p = JSON.parse(rawContent); return p._image ? p : null; } catch { return null; } })() : null;

                  if (!fileDecrypted) {
                    // Encrypted view for images: show fake .txt content if available
                    if (isImage && imageData?.fake_txt_content) {
                      return (
                        <pre className="text-xs text-black leading-5 whitespace-pre-wrap font-mono">
                          {imageData.fake_txt_content}
                        </pre>
                      );
                    }
                    // Default encrypted garble
                    return (
                      <pre className="text-xs text-[#800000] leading-5 whitespace-pre-wrap break-all font-mono">
{`[ЗАШИФРОВАННЫЙ ДОКУМЕНТ]\n${"─".repeat(34)}\n\n${encryptedContent()}\n\n${"─".repeat(34)}\n[ТРЕБУЕТСЯ РАСШИФРОВКА]`}
                      </pre>
                    );
                  }

                  // Decrypted view
                  if (isImage) {
                    const realUrl = (selectedFileData as { cdnUrl?: string | null }).cdnUrl || imageData?.cdn_url;
                    if (realUrl) {
                      return (
                        <div className="flex flex-col items-center gap-2">
                          <div className="border-2 border-[#808080] p-1 bg-[#f0f0f0]">
                            <img
                              src={realUrl}
                              alt={selectedFileData.name}
                              className="max-w-full max-h-[65vh] object-contain"
                            />
                          </div>
                          <div className="text-[10px] text-[#808080]">{selectedFileData.name}</div>
                        </div>
                      );
                    }
                    return <div className="text-[#808080] text-xs p-4">Изображение недоступно</div>;
                  }

                  return (
                    <pre className="text-xs leading-5 whitespace-pre-wrap text-black font-mono">
                      {rawContent ?? "Загрузка..."}
                    </pre>
                  );
                })()}
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
                  {selectedFileData ? `Формат: .${selectedFileData.type.toUpperCase()}` : "Готово"}
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
            <div className={inset() + " flex-1 overflow-auto"}>
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
                        <td className="px-2 py-0.5 text-[#808080] border-r border-[#e0e0e0] whitespace-nowrap text-[10px]">{ev.time.toLocaleTimeString("ru-RU")}</td>
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
                            {ev.type === "login" ? "ВХОД" : ev.type === "logout" ? "ВЫХОД" :
                             ev.type === "decrypt_ok" ? "РАСШ. ✓" : ev.type === "decrypt_fail" ? "РАСШ. ✗" :
                             ev.type === "session_expired" ? "ИСТЕЧЕНИЕ" : "ДЕЙСТВИЕ"}
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
              <button className={btn()} onClick={() => setHistory([])}>Очистить журнал</button>
            </div>
          </div>
        )}

        {activeTab === "help" && (
          <div className="flex-1 flex flex-col">
            <div className="bg-[#000080] px-2 py-0.5 text-white text-[10px] font-bold select-none">❓ Справочная система SecureFS</div>
            <div className={inset() + " flex-1 overflow-auto p-4"}>
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
                  { icon: "⚙", title: "Администратор", text: "Пользователь admin имеет доступ к панели администратора. Там можно добавлять и удалять загадки, а также загружать документы в папки файлового менеджера." },
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

        {activeTab === "admin" && isAdmin && (
          <div className="flex-1 flex flex-col">
            <div className="bg-[#800000] px-2 py-0.5 text-white text-[10px] font-bold select-none flex items-center gap-2">
              ⚙ Панель администратора — SecureFS 2.0
              <span className="text-orange-300 text-[9px]">ОГРАНИЧЕННЫЙ ДОСТУП</span>
            </div>

            {/* Admin sub-tabs */}
            <div className="bg-[#c0c0c0] border-b border-[#808080] px-1 py-0.5 flex gap-0.5 shrink-0">
              <button
                className={`text-xs px-3 py-0.5 ${adminTab === "riddles" ? "bg-[#800000] text-white" : "hover:bg-[#d4d0c8] text-black"}`}
                onClick={() => setAdminTab("riddles")}
              >
                🧩 Загадки ({dbRiddles.length})
              </button>
              <button
                className={`text-xs px-3 py-0.5 ${adminTab === "docs" ? "bg-[#800000] text-white" : "hover:bg-[#d4d0c8] text-black"}`}
                onClick={() => setAdminTab("docs")}
              >
                📄 Документы ({dbDocuments.length})
              </button>
            </div>

            <div className="flex-1 flex gap-2 overflow-hidden p-0">
              {adminTab === "riddles" && (
                <>
                  {/* Add riddle form */}
                  <div className="flex flex-col w-80 shrink-0 p-2">
                    <div className="bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] p-3 space-y-2">
                      <div className="text-xs font-bold border-b border-[#808080] pb-1 mb-2">➕ Добавить загадку</div>
                      <div>
                        <label className="text-[10px] font-bold block mb-1">Вопрос (загадка):</label>
                        <textarea
                          className={inset("w-full px-2 py-1 text-xs resize-none")}
                          rows={3}
                          value={newQuestion}
                          onChange={e => setNewQuestion(e.target.value)}
                          placeholder="Введите текст загадки..."
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold block mb-1">Правильный ответ:</label>
                        <input
                          className={inset("w-full px-2 py-1.5 text-xs")}
                          value={newAnswer}
                          onChange={e => setNewAnswer(e.target.value)}
                          placeholder="одно слово строчными..."
                          onKeyDown={e => e.key === "Enter" && handleAddRiddle()}
                        />
                      </div>
                      <button className={btn("w-full justify-center")} onClick={handleAddRiddle}>
                        Сохранить загадку
                      </button>
                      {adminMsg && (
                        <div className={`text-[10px] px-2 py-1 border ${adminMsg.includes("Ошибка") ? "border-red-400 bg-red-50 text-red-800" : "border-green-400 bg-green-50 text-green-800"}`}>
                          {adminMsg}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Riddles list */}
                  <div className="flex-1 flex flex-col p-2 pl-0">
                    <div className={inset() + " flex-1 overflow-auto"}>
                      <table className="w-full text-xs font-mono border-collapse">
                        <thead>
                          <tr className="bg-[#c0c0c0]">
                            <th className="text-left px-2 py-1 border-b-2 border-b-[#808080] text-[10px] w-8">#</th>
                            <th className="text-left px-2 py-1 border-b-2 border-b-[#808080] text-[10px]">Загадка</th>
                            <th className="text-left px-2 py-1 border-b-2 border-b-[#808080] text-[10px] w-28">Ответ</th>
                            <th className="px-2 py-1 border-b-2 border-b-[#808080] text-[10px] w-16">Удалить</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbRiddles.map((r, i) => (
                            <tr key={r.id} className={`border-b border-[#e0e0e0] ${i % 2 === 0 ? "bg-white" : "bg-[#f8f8f8]"}`}>
                              <td className="px-2 py-1 text-[#808080] text-[10px]">{r.id}</td>
                              <td className="px-2 py-1 text-[11px] max-w-xs">{r.question}</td>
                              <td className="px-2 py-1 text-[#000080] font-bold text-[10px]">{r.answer}</td>
                              <td className="px-2 py-1 text-center">
                                <button
                                  className={btn("text-[10px] px-2 py-0.5 text-red-800 hover:bg-red-100")}
                                  onClick={() => handleDeleteRiddle(r.id)}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                          {dbRiddles.length === 0 && (
                            <tr><td colSpan={4} className="px-2 py-4 text-[#808080] text-center text-[10px]">Нет загадок</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-[#c0c0c0] border-t-2 border-t-white p-2 flex justify-between items-center">
                      <span className="text-[10px] text-[#808080]">Загадок в базе: {dbRiddles.length}</span>
                      <button className={btn("text-[10px]")} onClick={loadRiddles}>⟳ Обновить</button>
                    </div>
                  </div>
                </>
              )}

              {adminTab === "docs" && (
                <>
                  {/* Upload form */}
                  <div className="flex flex-col w-80 shrink-0 p-2">
                    <div className="bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] p-3 space-y-2">
                      <div className="text-xs font-bold border-b border-[#808080] pb-1 mb-2">📤 Загрузить документ</div>
                      <div>
                        <label className="text-[10px] font-bold block mb-1">Папка назначения:</label>
                        <select
                          className={inset("w-full px-2 py-1.5 text-xs")}
                          value={uploadFolder}
                          onChange={e => setUploadFolder(e.target.value)}
                        >
                          {FOLDERS.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold block mb-1">Файл (.txt, .png, .jpg):</label>
                        <div className={inset("w-full px-2 py-1.5 text-[10px] text-[#808080] truncate")}>
                          {uploadFileName || "файл не выбран"}
                        </div>
                        <label className={btn("w-full justify-center mt-1 block text-center cursor-pointer")}>
                          Обзор...
                          <input type="file" className="hidden" accept=".txt,.png,.jpg,.jpeg" onChange={handleFileSelect} />
                        </label>
                      </div>
                      {(uploadFileType === "png" || uploadFileType === "jpg" || uploadFileType === "jpeg") && (
                        <div className="border-t border-dashed border-[#808080] pt-2">
                          <label className="text-[10px] font-bold block mb-0.5 text-[#800000]">🔒 Фейк-документ (.txt) — показывается до расшифровки:</label>
                          <div className="text-[9px] text-[#808080] mb-1">Текстовый файл с тем же именем, хранится отдельно как .txt</div>
                          <div className={inset("w-full px-2 py-1.5 text-[10px] text-[#808080] truncate")}>
                            {fakeFileName || "не выбрано (необязательно)"}
                          </div>
                          <label className={btn("w-full justify-center mt-1 block text-center cursor-pointer")}>
                            Обзор фейка...
                            <input type="file" className="hidden" accept=".txt" onChange={handleFakeFileSelect} />
                          </label>
                        </div>
                      )}
                      <button
                        className={btn(`w-full justify-center ${uploading ? "opacity-50" : ""}`)}
                        onClick={handleUpload}
                        disabled={uploading}
                      >
                        {uploading ? "Загружаю..." : "📤 Загрузить в систему"}
                      </button>
                      {adminMsg && (
                        <div className={`text-[10px] px-2 py-1 border ${adminMsg.includes("Ошибка") ? "border-red-400 bg-red-50 text-red-800" : "border-green-400 bg-green-50 text-green-800"}`}>
                          {adminMsg}
                        </div>
                      )}
                      <div className="text-[9px] text-[#808080] border-t border-[#c0c0c0] pt-2">
                        Файлы отмечены ★ в менеджере. PNG/JPG: фейк-документ (.txt) показывается до расшифровки как обычный текст. После расшифровки — оригинальное изображение.
                      </div>
                    </div>
                  </div>

                  {/* Documents list */}
                  <div className="flex-1 flex flex-col p-2 pl-0">
                    <div className={inset() + " flex-1 overflow-auto"}>
                      <table className="w-full text-xs font-mono border-collapse">
                        <thead>
                          <tr className="bg-[#c0c0c0]">
                            <th className="text-left px-2 py-1 border-b-2 border-b-[#808080] text-[10px] w-8">#</th>
                            <th className="text-left px-2 py-1 border-b-2 border-b-[#808080] text-[10px]">Имя файла</th>
                            <th className="text-left px-2 py-1 border-b-2 border-b-[#808080] text-[10px] w-28">Папка</th>
                            <th className="text-left px-2 py-1 border-b-2 border-b-[#808080] text-[10px] w-16">Тип</th>
                            <th className="px-2 py-1 border-b-2 border-b-[#808080] text-[10px] w-12">Фейк</th>
                            <th className="px-2 py-1 border-b-2 border-b-[#808080] text-[10px] w-16">Удалить</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbDocuments.map((d, i) => (
                            <tr key={d.id} className={`border-b border-[#e0e0e0] ${i % 2 === 0 ? "bg-white" : "bg-[#f8f8f8]"}`}>
                              <td className="px-2 py-1 text-[#808080] text-[10px]">{d.id}</td>
                              <td className="px-2 py-1 text-[11px]">{d.name}</td>
                              <td className="px-2 py-1 text-[#000080] text-[10px]">{FOLDERS.find(f => f.id === d.folder_id)?.name || d.folder_id}</td>
                              <td className="px-2 py-1 text-[10px] uppercase">.{d.file_type}</td>
                              <td className="px-2 py-1 text-center text-[10px]">
                                {d.fake_cdn_url ? <span className="text-green-700 font-bold">✓</span> : <span className="text-[#c0c0c0]">—</span>}
                              </td>
                              <td className="px-2 py-1 text-center">
                                <button
                                  className={btn("text-[10px] px-2 py-0.5 text-red-800 hover:bg-red-100")}
                                  onClick={() => handleDeleteDoc(d.id, d.name)}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                          {dbDocuments.length === 0 && (
                            <tr><td colSpan={6} className="px-2 py-4 text-[#808080] text-center text-[10px]">Нет загруженных документов</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-[#c0c0c0] border-t-2 border-t-white p-2 flex justify-between items-center">
                      <span className="text-[10px] text-[#808080]">Документов в системе: {dbDocuments.length}</span>
                      <button className={btn("text-[10px]")} onClick={loadDocuments}>⟳ Обновить</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-[#c0c0c0] border-t-2 border-t-white flex items-center px-2 py-0.5 gap-2 shrink-0 select-none">
        <div className={inset("px-2 text-[10px] text-[#404040] py-0.5 mr-1")}>
          Объектов: {selectedFolder ? allFiles.filter(f => f.folderId === selectedFolder).length : 0}
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
              <button className={btn("w-full text-center justify-center")} onClick={handleLogout}>
                Вернуться к авторизации
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
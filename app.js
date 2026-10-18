/**
 * НАОРУ — фейковый чат с руководителем.
 * Ответы собирает brain.js из контекста реплики и истории.
 */

const TONES = [
  { id: "passive", title: "Пассивно-агрессивный", blurb: "Ехидство + намёки", status: "онлайн · не беспокоить" },
  { id: "toxic", title: "Токсичный оптимист", blurb: "Челленджи и «команда»", status: "на волне · always on" },
  { id: "bureaucrat", title: "Бюрократ", blurb: "Тикеты и регламент", status: "в документообороте" },
  { id: "gaslight", title: "Газлайт", blurb: "«Тебе кажется»", status: "онлайн · спокойствие" },
  { id: "micro", title: "Микроменеджер", blurb: "Скрины и ETA", status: "смотрит в монитор" },
  { id: "kpi", title: "Эффективный менеджер", blurb: "KPI, цифры, метрики", status: "в дашборде" },
  { id: "silent", title: "Молчун", blurb: "Коротко, иногда с матом", status: "был(а) недавно" },
];

function g(m, f) {
  return state.gender === "f" ? f : m;
}

function apologyFor(tone) {
  if (tone === "custom" && state.scenario && state.scenario.sorry) {
    return state.scenario.sorry;
  }
  if (tone === "custom" && state.scenario && state.scenario.brief) {
    const hook = state.scenario.brief.replace(/\s+/g, " ").trim().slice(0, 70);
    return `Извини. Я вёл себя криво в ситуации: ${hook}${hook.length >= 70 ? "…" : ""}.`;
  }
  const map = {
    passive: "Пожалуй, я был неправ. Ты тянешь больше, чем видно — а я отвечал криво.",
    toxic: "Извини. Без тебя этот хаос бы не взлетел. Я прикрывался «командой» вместо спасибо.",
    bureaucrat: "Фиксирую: претензии справедливы. Извини, что прятался за регламенты.",
    gaslight: g(
      "Извини. Я обесценивал. Ты был прав — тебе не казалось.",
      "Извини. Я обесценивал. Ты была права — тебе не казалось."
    ),
    micro: "Сорри, что дышал в затылок. Ты и так на уровне.",
    kpi: "Извини. Я прятался за KPI вместо нормального разговора. Ты больше, чем метрика.",
    silent: "…извини. ты ок. правда. я молчал, когда надо было поддержать.",
  };
  return map[tone] || map.passive;
}

function praiseFor(tone) {
  if (tone === "custom" && state.scenario && state.scenario.praise) {
    return state.scenario.praise;
  }
  if (tone === "custom") {
    return g(
      "Ты держишь реальность, когда вокруг хаос. Это видно — и это ценно.",
      "Ты держишь реальность, когда вокруг хаос. Это видно — и это ценно."
    );
  }
  const map = {
    passive: "Честно: на тебя можно опереться, когда остальные расползаются. Это редкость.",
    toxic: "Ты — тот человек, из‑за которого цели вообще реалистичны. Не слоган, а факт.",
    bureaucrat: "По качеству и срокам ты стабильно выше среднего. Это стоит сказать прямо.",
    gaslight: g(
      "Ты внимательный и держишь реальность, когда вокруг туман. Так и есть.",
      "Ты внимательная и держишь реальность, когда вокруг туман. Так и есть."
    ),
    micro: g(
      "Ты самоходный профессионал. Мне стоило доверять раньше.",
      "Ты самоходная профессионалка. Мне стоило доверять раньше."
    ),
    kpi: "Твои цифры — следствие, а не причина. Ты тянешь результат там, где таблица молчит.",
    silent: g(
      "спасибо, что тянешь. я это вижу. ты важен.",
      "спасибо, что тянешь. я это вижу. ты важна."
    ),
  };
  return map[tone] || map.passive;
}

function yellsFor() {
  return [
    "Мне плевать на ваш «синк»",
    "Хватит двигать дедлайны",
    g("Я не ваш личный пожарный", "Я не ваша личная пожарная"),
    "Хватит обесценивать",
    "Это не срочно — это ваша тревога",
    "Перестаньте писать в 23:40",
    "Да блять, нормально ставьте задачи",
    "Какого хуя опять всё на мне?",
    "Пиздец, а не управление",
    g("Я устал спасать ваш бардак", "Я устала спасать ваш бардак"),
  ];
}

const SC_KEY = "naoru_scenario_v1";

const state = {
  bossName: "Руководитель",
  gender: null,
  tone: null,
  steam: 100,
  finaleStarted: false,
  pendingTimer: null,
  history: [],
  setupMode: "chat",
  lastTranslation: "",
  scenario: null,
};

const $ = (s) => document.querySelector(s);

function show(id) {
  ["setup", "chat", "finale", "translator"].forEach((key) => {
    const el = $(`#${key}`);
    if (el) el.classList.toggle("is-on", key === id);
  });
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scrollThread() {
  const t = $("#thread");
  t.scrollTop = t.scrollHeight;
}

function addMsg(text, type, opts) {
  const el = document.createElement("div");
  el.className = "msg msg-" + type;

  const replyTo = opts && opts.replyTo;
  if (replyTo && type === "in") {
    const quote = document.createElement("div");
    quote.className = "msg-reply";
    const name = document.createElement("span");
    name.className = "msg-reply-name";
    name.textContent = "Вы";
    const prev = document.createElement("span");
    prev.className = "msg-reply-text";
    prev.textContent = replyTo;
    quote.append(name, prev);
    el.appendChild(quote);
  }

  const body = document.createElement("div");
  body.className = "msg-body";
  body.textContent = text;
  el.appendChild(body);

  $("#thread").appendChild(el);
  scrollThread();
  return el;
}

function setSteam(n) {
  state.steam = Math.max(0, Math.min(100, n));
  $("#steamBar").style.width = state.steam + "%";
}

function setStatus(text, cls) {
  const el = $("#whoStatus");
  el.textContent = text;
  el.className = "who-status" + (cls ? " " + cls : "");
}

function pushHistory(role, text) {
  state.history.push({ role, text, at: Date.now() });
  if (state.history.length > 40) state.history.shift();
}

function craftReply(userText) {
  if (window.NaoruBrain && typeof window.NaoruBrain.craftBossReply === "function") {
    const out = window.NaoruBrain.craftBossReply({
      tone: state.tone,
      gender: state.gender,
      userText,
      history: state.history,
      scenario: state.scenario,
    });
    if (out && typeof out === "object") return out;
    return { text: String(out), replyTo: "" };
  }
  return { text: "Понял. Давай без крика — по фактам.", replyTo: "" };
}

function renderGenderInto(boxId) {
  const box = $(boxId);
  if (!box) return;
  box.innerHTML = "";
  [
    { id: "m", label: "Мужской" },
    { id: "f", label: "Женский" },
  ].forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gender-btn" + (state.gender === opt.id ? " active" : "");
    btn.textContent = opt.label;
    btn.addEventListener("click", () => {
      state.gender = opt.id;
      renderGenderInto("#gender");
      renderGenderInto("#genderTr");
      renderGenderInto("#genderSc");
      renderYells();
      syncStart();
      syncScenarioStart();
      syncTranslatorStart();
    });
    box.appendChild(btn);
  });
}

function renderGender() {
  renderGenderInto("#gender");
  renderGenderInto("#genderTr");
  renderGenderInto("#genderSc");
}

function setSetupMode(mode) {
  state.setupMode = mode;
  const chat = mode === "chat";
  const scenario = mode === "scenario";
  const translator = mode === "translator";
  $("#modeChat").classList.toggle("active", chat);
  $("#modeScenario").classList.toggle("active", scenario);
  $("#modeTranslator").classList.toggle("active", translator);
  $("#howChat").hidden = !chat;
  $("#howScenario").hidden = !scenario;
  $("#howTranslator").hidden = !translator;
  $("#chatSetup").hidden = !chat;
  $("#scenarioSetup").hidden = !scenario;
  $("#translatorSetup").hidden = !translator;
}

function readScenarioForm() {
  return {
    bossName: ($("#scBossName").value || "").trim(),
    brief: ($("#scBrief").value || "").trim(),
    style: ($("#scStyle").value || "").trim(),
    hello: ($("#scHello").value || "").trim(),
    sorry: ($("#scSorry").value || "").trim(),
    praise: ($("#scPraise").value || "").trim(),
    yells: ($("#scYells").value || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12),
  };
}

function fillScenarioForm(data) {
  if (!data) return;
  if (data.bossName) $("#scBossName").value = data.bossName;
  if (data.brief) $("#scBrief").value = data.brief;
  if (data.style) $("#scStyle").value = data.style;
  if (data.hello) $("#scHello").value = data.hello;
  if (data.sorry) $("#scSorry").value = data.sorry;
  if (data.praise) $("#scPraise").value = data.praise;
  if (data.yells && data.yells.length) $("#scYells").value = data.yells.join("\n");
}

function saveScenarioLocal(data) {
  try {
    localStorage.setItem(SC_KEY, JSON.stringify(data));
  } catch (_) {
    /* ignore */
  }
}

function loadScenarioLocal() {
  try {
    const raw = localStorage.getItem(SC_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function syncScenarioStart() {
  const btn = $("#startScenarioBtn");
  if (!btn) return;
  const sc = readScenarioForm();
  btn.disabled = !(state.gender && sc.bossName.length >= 2 && sc.brief.length >= 8 && sc.style.length >= 8);
}

function syncTranslatorStart() {
  const btn = $("#openTranslatorBtn");
  if (btn) btn.disabled = !state.gender;
}

function openTranslator() {
  if (!state.gender) return;
  state.lastTranslation = "";
  $("#trOut").textContent = "Уважаемые коллеги…";
  $("#trCopyBtn").disabled = true;
  show("translator");
  $("#trIn").focus();
}

function runTranslate() {
  const raw = $("#trIn").value;
  if (!window.NaoruTranslator) {
    $("#trOut").textContent = "Переводчик не загрузился. Обнови страницу.";
    return;
  }
  const out = window.NaoruTranslator.translateMatGendered(raw, state.gender);
  if (out.empty) {
    $("#trOut").textContent = "Сначала вставь ор слева.";
    $("#trCopyBtn").disabled = true;
    state.lastTranslation = "";
    return;
  }
  state.lastTranslation = out.text;
  $("#trOut").textContent = out.text;
  $("#trCopyBtn").disabled = false;
}

async function copyTranslation() {
  if (!state.lastTranslation) return;
  try {
    await navigator.clipboard.writeText(state.lastTranslation);
    const btn = $("#trCopyBtn");
    const prev = btn.textContent;
    btn.textContent = "Скопировано";
    setTimeout(() => {
      btn.textContent = prev;
    }, 1200);
  } catch (_) {
    /* ignore */
  }
}

function renderTones() {
  const box = $("#tones");
  box.innerHTML = "";
  TONES.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tone" + (state.tone === t.id ? " active" : "");
    btn.innerHTML = "<strong>" + t.title + "</strong><span>" + t.blurb + "</span>";
    btn.addEventListener("click", () => {
      state.tone = t.id;
      renderTones();
      syncStart();
    });
    box.appendChild(btn);
  });
}

function renderYells() {
  const box = $("#yells");
  box.innerHTML = "";
  const list =
    state.tone === "custom" && state.scenario && state.scenario.yells && state.scenario.yells.length
      ? state.scenario.yells
      : yellsFor();
  list.forEach((y) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "yell-chip";
    b.textContent = y;
    b.addEventListener("click", () => sendYou(y));
    box.appendChild(b);
  });
}

function syncStart() {
  const name = $("#bossName").value.trim();
  $("#startBtn").disabled = !(state.gender && name.length >= 2 && state.tone);
}

function clearPending() {
  if (state.pendingTimer) {
    clearTimeout(state.pendingTimer);
    state.pendingTimer = null;
  }
}

function openingLine() {
  if (state.tone === "custom" && state.scenario) {
    if (state.scenario.hello) return state.scenario.hello;
    const bits = String(state.scenario.style || "")
      .split(/[\n;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (bits.length) return bits[0].replace(/\.$/, "") + (bits[0].endsWith("?") ? "" : ".");
    return "Ну что, по делу?";
  }
  const map = {
    passive: "Ну привет. Надеюсь, это по делу.",
    toxic: g("Хей! Готов к продуктивному дню?", "Хей! Готова к продуктивному дню?"),
    bureaucrat: "Добрый день. Пишите по форме.",
    gaslight: "Привет. Всё спокойно?",
    micro: g("Привет. Статус с утра видел?", "Привет. Статус с утра видела?"),
    kpi: g(
      "Привет. Какие цифры за сегодня? KPI в дашборде смотрел?",
      "Привет. Какие цифры за сегодня? KPI в дашборде смотрела?"
    ),
    silent: "привет",
  };
  return map[state.tone] || map.passive;
}

function beginChat({ bossName, toneId, statusText, sysHint }) {
  clearPending();
  state.bossName = bossName || "Руководитель";
  state.tone = toneId;
  state.steam = 100;
  state.finaleStarted = false;
  state.history = [];
  setSteam(100);
  $("#whoName").textContent = state.bossName;
  setStatus(statusText || "онлайн · private", "busy");
  $("#thread").innerHTML = "";
  addMsg("private · сообщения не покидают браузер", "sys");
  addMsg(sysHint || state.bossName + " отвечает по смыслу твоих фраз.", "sys");
  renderYells();
  const hello = openingLine();
  addMsg(hello, "in");
  pushHistory("boss", hello);
  show("chat");
  $("#msgInput").focus();
}

function openChat() {
  state.scenario = null;
  const tone = TONES.find((t) => t.id === state.tone);
  beginChat({
    bossName: $("#bossName").value.trim() || "Руководитель",
    toneId: state.tone,
    statusText: tone ? tone.status : "онлайн · private",
    sysHint: ( $("#bossName").value.trim() || "Руководитель") + " отвечает по смыслу твоих фраз (и может с матом, если орёшь).",
  });
}

function openScenarioChat() {
  const sc = readScenarioForm();
  if (!(state.gender && sc.bossName.length >= 2 && sc.brief.length >= 8 && sc.style.length >= 8)) return;
  saveScenarioLocal(sc);
  state.scenario = sc;
  beginChat({
    bossName: sc.bossName,
    toneId: "custom",
    statusText: "по твоему сценарию",
    sysHint: "Сценарий: " + sc.brief.slice(0, 120) + (sc.brief.length > 120 ? "…" : ""),
  });
}

function sendYou(text) {
  const msg = String(text || "").trim();
  if (!msg || state.finaleStarted) return;

  addMsg(msg, "out");
  pushHistory("user", msg);

  const heat = window.NaoruBrain ? window.NaoruBrain.heatOf(msg) : 1;
  setSteam(state.steam - (8 + heat * 3 + rand([0, 1, 2])));
  $("#msgInput").value = "";
  scheduleBossReply(msg);

  if (state.steam <= 15) {
    state.pendingTimer = setTimeout(() => startFinale(false), 1100);
  }
}

function scheduleBossReply(userText) {
  clearPending();
  const heat = window.NaoruBrain ? window.NaoruBrain.heatOf(userText) : 0;
  const delay =
    state.tone === "silent"
      ? rand([1200, 1800, 2600])
      : heat >= 3
        ? rand([400, 700, 1000])
        : rand([550, 900, 1300]);

  setStatus("печатает…", "typing");
  state.pendingTimer = setTimeout(() => {
    if (state.finaleStarted) return;
    const { text, replyTo } = craftReply(userText);
    addMsg(text, "in", { replyTo });
    pushHistory("boss", text);
    if (state.tone === "custom") {
      setStatus("по твоему сценарию", "busy");
    } else {
      const tone = TONES.find((t) => t.id === state.tone);
      setStatus(tone ? tone.status : "онлайн", "busy");
    }
  }, delay);
}

function startFinale(manual) {
  if (state.finaleStarted) return;
  state.finaleStarted = true;
  clearPending();
  setStatus("печатает…", "typing");
  addMsg("— пауза —", "sys");

  const sorry = apologyFor(state.tone);
  const praise = praiseFor(state.tone);

  setTimeout(() => {
    addMsg(sorry, "in");
    const el = $("#thread").lastElementChild;
    if (el) el.classList.add("msg-soft");
    setStatus("онлайн", "");
  }, 900);

  setTimeout(() => {
    addMsg(praise, "in");
    const el = $("#thread").lastElementChild;
    if (el) el.classList.add("msg-soft");
  }, 2000);

  setTimeout(() => {
    setSteam(0);
    const quotes = $("#finaleQuotes");
    quotes.innerHTML = "";
    const a = document.createElement("div");
    a.className = "msg msg-in msg-soft";
    a.textContent = sorry;
    const b = document.createElement("div");
    b.className = "msg msg-in msg-soft";
    b.textContent = praise;
    quotes.append(a, b);
    $("#finaleTitle").textContent = manual ? "Извинения получены" : "Пар вышел";
    $("#finaleKicker").textContent = "0 сообщений отправлено · " + state.bossName;
    show("finale");
  }, 3200);
}

$("#bossName").addEventListener("input", syncStart);
$("#startBtn").addEventListener("click", openChat);
$("#backBtn").addEventListener("click", () => {
  state.finaleStarted = true;
  clearPending();
  show("setup");
});
$("#sendBtn").addEventListener("click", () => sendYou($("#msgInput").value));
$("#msgInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendYou($("#msgInput").value);
  }
});
$("#enoughBtn").addEventListener("click", () => startFinale(true));
$("#againBtn").addEventListener("click", () => {
  if (state.tone === "custom" && state.scenario) openScenarioChat();
  else openChat();
});
$("#homeBtn").addEventListener("click", () => show("setup"));

$("#modeChat").addEventListener("click", () => setSetupMode("chat"));
$("#modeScenario").addEventListener("click", () => setSetupMode("scenario"));
$("#modeTranslator").addEventListener("click", () => setSetupMode("translator"));
$("#openTranslatorBtn").addEventListener("click", openTranslator);
$("#trBackBtn").addEventListener("click", () => show("setup"));
$("#trGoBtn").addEventListener("click", runTranslate);
$("#trCopyBtn").addEventListener("click", copyTranslation);
$("#trIn").addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    runTranslate();
  }
});

$("#startScenarioBtn").addEventListener("click", openScenarioChat);
["scBossName", "scBrief", "scStyle", "scHello", "scSorry", "scPraise", "scYells"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", syncScenarioStart);
});

renderGender();
renderTones();
renderYells();
fillScenarioForm(loadScenarioLocal());
setSetupMode("chat");
syncTranslatorStart();
syncScenarioStart();
show("setup");

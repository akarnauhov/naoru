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
  { id: "silent", title: "Молчун", blurb: "Коротко, иногда с матом", status: "был(а) недавно" },
];

const APOLOGY = {
  passive: "Пожалуй, я был неправ. Ты тянешь больше, чем видно — а я отвечал криво.",
  toxic: "Извини. Без тебя этот хаос бы не взлетел. Я прикрывался «командой» вместо спасибо.",
  bureaucrat: "Фиксирую: претензии справедливы. Извини, что прятался за регламенты.",
  gaslight: "Извини. Я обесценивал. Ты был(а) прав(а) — тебе не казалось.",
  micro: "Сорри, что дышал в затылок. Ты и так на уровне.",
  silent: "…извини. ты ок. правда. я молчал, когда надо было поддержать.",
};

const PRAISE = {
  passive: "Честно: на тебя можно опереться, когда остальные расползаются. Это редкость.",
  toxic: "Ты — тот человек, из‑за которого цели вообще реалистичны. Не слоган, а факт.",
  bureaucrat: "По качеству и срокам ты стабильно выше среднего. Это стоит сказать прямо.",
  gaslight: "Ты внимательный(ая) и держишь реальность, когда вокруг туман. Так и есть.",
  micro: "Ты самоходный профессионал. Мне стоило доверять раньше.",
  silent: "спасибо, что тянешь. я это вижу. ты важен(важна).",
};

const YELLS = [
  "Мне плевать на ваш «синк»",
  "Хватит двигать дедлайны",
  "Я не ваш личный пожарный",
  "Хватит обесценивать",
  "Это не срочно — это ваша тревога",
  "Перестаньте писать в 23:40",
  "Да блять, нормально ставьте задачи",
  "Какого хуя опять всё на мне?",
  "Пиздец, а не управление",
  "Я устал(а) спасать ваш бардак",
];

const state = {
  bossName: "Руководитель",
  tone: null,
  steam: 100,
  finaleStarted: false,
  pendingTimer: null,
  history: [],
};

const $ = (s) => document.querySelector(s);

function show(id) {
  ["setup", "chat", "finale"].forEach((key) => {
    $(`#${key}`).classList.toggle("is-on", key === id);
  });
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scrollThread() {
  const t = $("#thread");
  t.scrollTop = t.scrollHeight;
}

function addMsg(text, type) {
  const el = document.createElement("div");
  el.className = "msg msg-" + type;
  el.textContent = text;
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
    return window.NaoruBrain.craftBossReply({
      tone: state.tone,
      userText,
      history: state.history,
    });
  }
  return "Понял. Давай без крика — по фактам.";
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
  YELLS.forEach((y) => {
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
  $("#startBtn").disabled = !(name.length >= 2 && state.tone);
}

function clearPending() {
  if (state.pendingTimer) {
    clearTimeout(state.pendingTimer);
    state.pendingTimer = null;
  }
}

function openingLine() {
  const map = {
    passive: "Ну привет. Надеюсь, это по делу.",
    toxic: "Хей! Готов(а) к продуктивному дню?",
    bureaucrat: "Добрый день. Пишите по форме.",
    gaslight: "Привет. Всё спокойно?",
    micro: "Привет. Статус с утра видел(а)?",
    silent: "привет",
  };
  return map[state.tone] || map.passive;
}

function openChat() {
  clearPending();
  state.bossName = $("#bossName").value.trim() || "Руководитель";
  state.steam = 100;
  state.finaleStarted = false;
  state.history = [];
  setSteam(100);
  $("#whoName").textContent = state.bossName;
  const tone = TONES.find((t) => t.id === state.tone);
  setStatus(tone ? tone.status : "онлайн · private", "busy");
  $("#thread").innerHTML = "";
  addMsg("private · сообщения не покидают браузер", "sys");
  addMsg(state.bossName + " отвечает по смыслу твоих фраз (и может с матом, если орёшь).", "sys");
  const hello = openingLine();
  addMsg(hello, "in");
  pushHistory("boss", hello);
  show("chat");
  $("#msgInput").focus();
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
    const line = craftReply(userText);
    addMsg(line, "in");
    pushHistory("boss", line);
    const tone = TONES.find((t) => t.id === state.tone);
    setStatus(tone ? tone.status : "онлайн", "busy");
  }, delay);
}

function startFinale(manual) {
  if (state.finaleStarted) return;
  state.finaleStarted = true;
  clearPending();
  setStatus("печатает…", "typing");
  addMsg("— пауза —", "sys");

  const sorry = APOLOGY[state.tone] || APOLOGY.passive;
  const praise = PRAISE[state.tone] || PRAISE.passive;

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
$("#againBtn").addEventListener("click", openChat);
$("#homeBtn").addEventListener("click", () => show("setup"));

renderTones();
renderYells();
show("setup");

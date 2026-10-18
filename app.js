/**
 * НАОРУ — фейковый чат с руководителем.
 */

const TONES = [
  { id: "passive", title: "Пассивно-агрессивный", blurb: "«Как удобно», язвительные паузы", status: "онлайн · не беспокоить" },
  { id: "toxic", title: "Токсичный оптимист", blurb: "«Мы команда», челленджи и 🚀", status: "на волне · always on" },
  { id: "bureaucrat", title: "Бюрократ", blurb: "Тикеты, согласования, EOD", status: "в документообороте" },
  { id: "gaslight", title: "Газлайт", blurb: "«Ты слишком эмоционально»", status: "онлайн · спокойствие" },
  { id: "micro", title: "Микроменеджер", blurb: "Скрины, ETA, контроль", status: "смотрит в монитор" },
  { id: "silent", title: "Молчун", blurb: "Долгий typing… потом «ок»", status: "был(а) недавно" },
];

const REPLIES = {
  passive: [
    "Ок. Забавно, что это всплывает именно сейчас.",
    "Я всё понял. Просто ожидал другого приоритета с твоей стороны.",
    "Можно и так. Обычно мы договариваемся иначе — но ладно.",
    "Спасибо за… обратную связь. Запишу куда-нибудь.",
    "Тон, конечно, спорный. Но услышал.",
    "Интересно. А дедлайны при этом сами себя подвинут?",
    "Хм. Я думал, мы на одной волне. Видимо, нет.",
    "Если это срочно, странно, что раньше молчал(а).",
    "Понял твоё недовольство. Оно довольно громкое.",
    "Хорошо. Будем считать, что ты высказался(ась).",
  ],
  toxic: [
    "Люблю эту энергию! Давай завернём в win-win.",
    "Мы команда. Через такое становятся сильнее!",
    "Это челлендж роста, если посмотреть под углом.",
    "Огонь. Сохрани драйв до пятничного демо.",
    "Понимаю. Но цель же амбициозная — и это круто.",
    "Супер, что неравнодушен(на). Так рождаются прорывы.",
    "Вайб поймал. Теперь конвертируем в результат!",
    "Тяжело? Значит, зона роста рядом.",
    "Спасибо, что горишь. Без пассионариев никуда.",
    "Давай после этого синк на позитиве устроим.",
  ],
  bureaucrat: [
    "Оформите претензию комментарием в задаче, пожалуйста.",
    "Вынесем на синк. Текущий статус: в работе.",
    "Без тикета эскалировать не могу. Процесс.",
    "Нужен апдейт статуса до EOD и ссылка на док.",
    "Это вне скоупа текущего спринта.",
    "Добавьте пункт в протокол — иначе не зафиксируем.",
    "Жду письмо с темой и копией руководителю направления.",
    "Согласно регламенту, сначала L1, потом эскалация.",
    "Переоткройте задачу с правильным лейблом.",
    "Календарь на следующую неделю уже плотный.",
  ],
  gaslight: [
    "Ты сейчас слишком эмоционально это подаёшь.",
    "Я такого не говорил. Ты, наверное, не так услышал(а).",
    "Странно. Обычно ты спокойнее.",
    "Может, просто тяжёлый день? Не надо персонализировать.",
    "Мы же нормально общались. Откуда вдруг шторм?",
    "Давай без драмы. Я всегда был открыт к диалогу.",
    "Мне кажется, ты преувеличиваешь масштаб.",
    "Никто тебя не обвинял. Ты сам(а) так решил(а).",
    "Может, перечитаешь переписку? Там всё иначе.",
    "Я за конструктив. Давай без ярлыков.",
  ],
  micro: [
    "Скинь скрин, где именно затык. Прямо сейчас.",
    "Почему это не было в статусе в 9:01?",
    "Нужны пункты, ETA и риски. В одном сообщении.",
    "Я просто рядом проконтролирую детали.",
    "Перешли черновик, даже сырой. Хочу видеть ход.",
    "Давай ещё раз чеклист пройдёмся вместе.",
    "А кто апрувил этот подход? Есть тред?",
    "Напиши, чем занят(а) последние 40 минут.",
    "Сделай короткий апдейт каждые полчаса, ок?",
    "Я открою файл и поправлю пару мелочей сам.",
  ],
  silent: [
    "ок",
    "в работе",
    "понял",
    "…",
    "мм",
    "принято",
    "позже",
    "ага",
    "видно",
    "разберёмся",
  ],
};

const KEYWORD_REPLIES = {
  срок: {
    passive: "Сроки — штука гибкая. Особенно когда эмоции горячие.",
    toxic: "Дедлайн — это мотиватор! Мы успеем, если зарядимся.",
    bureaucrat: "Перенос срока возможен через заявку на изменение.",
    gaslight: "Срок всегда был понятен. Ты просто сейчас накрутил(а).",
    micro: "Какой точный ETA по часам? И почему сдвиг?",
    silent: "срок ок",
  },
  зарплат: {
    passive: "О kompensации лучше не в таком тоне, тебе не кажется?",
    toxic: "Про ценность поговорим! Ты часть success story.",
    bureaucrat: "Вопросы оплаты — через HR-тикет, не через этот канал.",
    gaslight: "Никто не обещал того, что тебе померещилось.",
    micro: "Сначала закроем KPI, потом разговор про деньги.",
    silent: "не здесь",
  },
  ноч: {
    passive: "Ночные сообщения — знак вовлечённости. Или нет?",
    toxic: "Иногда магия случается после 23:00!",
    bureaucrat: "В нерабочее время ответы не гарантируются.",
    gaslight: "Я написал(а) нормально. Ты сам(а) решил(а) отвечать.",
    micro: "Если дедлайн горит — время условно.",
    silent: "увидел",
  },
  созвон: {
    passive: "Созвон можно. Если найдёшь слот в моём календаре.",
    toxic: "Давай созвон! Синхронизируем энергию.",
    bureaucrat: "Поставьте встречу с повесткой и целями.",
    gaslight: "Созвон не обязателен. Ты просто избегаешь письма.",
    micro: "Созвон на 15 минут. С демо экрана.",
    silent: "созвон позже",
  },
};

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
  "Нормально ставьте задачи",
  "Хватит обесценивать",
  "Я устал(а) спасать бардак",
  "Это не срочно — это ваша тревога",
  "Перестаньте писать в 23:40",
  "Хватит угадывать за меня",
  "Довольно микровмешательства",
];

const state = {
  bossName: "Руководитель",
  tone: null,
  steam: 100,
  finaleStarted: false,
  usedReplies: new Set(),
  pendingTimer: null,
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

function pickReply(userText) {
  const tone = state.tone || "passive";
  const lower = (userText || "").toLowerCase();

  for (const key of Object.keys(KEYWORD_REPLIES)) {
    if (lower.includes(key)) {
      const line = KEYWORD_REPLIES[key][tone];
      if (line && !state.usedReplies.has("kw:" + key + tone)) {
        state.usedReplies.add("kw:" + key + tone);
        return line;
      }
    }
  }

  const pool = REPLIES[tone] || REPLIES.passive;
  const free = pool.filter((line) => !state.usedReplies.has(line));
  const line = free.length ? rand(free) : rand(pool);
  state.usedReplies.add(line);
  if (state.usedReplies.size > 40) state.usedReplies.clear();
  return line;
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

function openChat() {
  clearPending();
  state.bossName = $("#bossName").value.trim() || "Руководитель";
  state.steam = 100;
  state.finaleStarted = false;
  state.usedReplies = new Set();
  setSteam(100);
  $("#whoName").textContent = state.bossName;
  const tone = TONES.find((t) => t.id === state.tone);
  setStatus(tone ? tone.status : "онлайн · private", "busy");
  $("#thread").innerHTML = "";
  addMsg("private · сообщения не покидают браузер", "sys");
  addMsg(state.bossName + " в чате. Можно начинать.", "sys");
  addMsg(openingLine(), "in");
  show("chat");
  $("#msgInput").focus();
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

function sendYou(text) {
  const msg = String(text || "").trim();
  if (!msg || state.finaleStarted) return;

  addMsg(msg, "out");
  setSteam(state.steam - rand([9, 11, 13, 15]));
  $("#msgInput").value = "";
  scheduleBossReply(msg);

  if (state.steam <= 15) {
    state.pendingTimer = setTimeout(() => startFinale(false), 1000);
  }
}

function scheduleBossReply(userText) {
  clearPending();
  const delay = state.tone === "silent" ? rand([1400, 2000, 2800]) : rand([500, 800, 1100, 1400]);
  setStatus("печатает…", "typing");
  state.pendingTimer = setTimeout(() => {
    if (state.finaleStarted) return;
    addMsg(pickReply(userText), "in");
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

  setTimeout(() => {
    addMsg(APOLOGY[state.tone] || APOLOGY.passive, "in");
    const el = $("#thread").lastElementChild;
    if (el) el.classList.add("msg-soft");
    setStatus("онлайн", "");
  }, 900);

  setTimeout(() => {
    addMsg(PRAISE[state.tone] || PRAISE.passive, "in");
    const el = $("#thread").lastElementChild;
    if (el) el.classList.add("msg-soft");
  }, 2000);

  setTimeout(() => {
    setSteam(0);
    const quotes = $("#finaleQuotes");
    quotes.innerHTML = "";
    const a = document.createElement("div");
    a.className = "msg msg-in msg-soft";
    a.textContent = APOLOGY[state.tone] || APOLOGY.passive;
    const b = document.createElement("div");
    b.className = "msg msg-in msg-soft";
    b.textContent = PRAISE[state.tone] || PRAISE.passive;
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

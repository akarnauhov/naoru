/**
 * НАОРУ — фейковый чат с руководителем. Пар наружу, сообщения никуда.
 */

const TONES = [
  {
    id: "passive",
    title: "Пассивно-агрессивный",
    blurb: "«Как удобно», «я имел в виду другое»",
    status: "онлайн · не беспокоить",
  },
  {
    id: "toxic",
    title: "Токсичный оптимист",
    blurb: "«Мы же команда», «челлендж»",
    status: "на волне · always on",
  },
  {
    id: "bureaucrat",
    title: "Бюрократ",
    blurb: "«В трекер», «на согласовании»",
    status: "в документообороте",
  },
  {
    id: "gaslight",
    title: "Газлайт",
    blurb: "«Ты слишком эмоционально»",
    status: "онлайн · спокойствие",
  },
  {
    id: "micro",
    title: "Микроменеджер",
    blurb: "«Скинь скрин», «почему не в 9:01»",
    status: "смотрит в монитор",
  },
  {
    id: "silent",
    title: "Молчун",
    blurb: "Долгий typing… потом «ок»",
    status: "был(а) недавно",
  },
];

const REPLIES = {
  passive: [
    "Ок. Забавно, что это всплывает именно сейчас.",
    "Я, конечно, всё понял. Просто ожидал другого приоритета.",
    "Можно и так. Хотя обычно мы договариваемся иначе.",
    "Спасибо за обратную связь. Зафиксирую… где-нибудь.",
    "Не уверен, что тон продуктивный. Но ладно.",
    "Интересно. А сроки при этом lagом не страдают?",
  ],
  toxic: [
    "Люблю энергию! Давай завернём это в win-win.",
    "Мы команда. Команды через такое проходят сильнее.",
    "Это же челлендж роста, если подумать!",
    "Огонь. Сохрани этот драйв до демо.",
    "Понимаю. Но у нас же амбициозная цель 🚀",
    "Супер, что неравнодушен(на). Так рождаются прорывы.",
  ],
  bureaucrat: [
    "Прошу оформить претензию комментарием в задаче.",
    "Вынесем на синк. Пока статус: в работе.",
    "Без тикета не могу эскалировать. Правила.",
    "Нужен апдейт в статусе до EOD.",
    "Это вне текущего скоупа спринта.",
    "Заведите пункт в протоколе, пожалуйста.",
  ],
  gaslight: [
    "Ты сейчас слишком эмоционально это подаёшь.",
    "Я такого не говорил. Ты, наверное, не так услышал(а).",
    "Странно. Обычно ты спокойнее реагируешь.",
    "Может, просто тяжёлый день? Не персонализируй.",
    "Мы же нормально общались. Откуда вдруг это?",
    "Давай без драмы. Я всегда был открыт.",
  ],
  micro: [
    "Скинь скрин, где именно затык.",
    "А почему это не было в статусе в 9:01?",
    "Напиши по пунктам. И ETA. И риски.",
    "Я рядом, просто проконтролирую детали.",
    "Перешли черновик, даже если сырой.",
    "Давай ещё раз пройдёмся по чеклисту.",
  ],
  silent: ["ок", "в работе", "понял", "…", "мм", "принято"],
};

const APOLOGY = {
  passive: (name) =>
    `${name}, пожалуй, я был неправ. Ты тянешь больше, чем видно со стороны — и я это замечал, но молчал криво.`,
  toxic: (name) =>
    `${name}, извини. Без тебя этот хаос бы не взлетел. Я прикрывался «командой», когда надо было просто сказать спасибо.`,
  bureaucrat: (name) =>
    `${name}, фиксирую: претензии справедливы. Отмечаю твой вклад отдельно от процессов. Извини, что прятался за регламенты.`,
  gaslight: (name) =>
    `${name}, извини. Я обесценивал. Ты всё это время был(а) прав(а) — и тебе не казалось.`,
  micro: (name) =>
    `${name}, сорри, что дышал в затылок. Ты и так на уровне. Контроль был моей тревогой, не твоей ошибкой.`,
  silent: (name) => `${name}… извини. ты ок. правда. я просто молчал, когда надо было поддержать.`,
};

const PRAISE = {
  passive: (name) =>
    `Честно: ${name}, на тебя можно опереться, когда остальные расползаются. Это редкость.`,
  toxic: (name) =>
    `${name}, ты — тот человек, из‑за которого цели вообще реалистичны. Не слоган, а факт.`,
  bureaucrat: (name) =>
    `${name}, по качеству и срокам ты стабильно выше среднего. Это стоит сказать прямо.`,
  gaslight: (name) =>
    `${name}, ты внимательный(ая), точный(ая) и держишь реальность, когда вокруг туман. Так и есть.`,
  micro: (name) =>
    `${name}, ты самоходный профессионал. Мне стоило доверять раньше и мешать меньше.`,
  silent: (name) => `${name}. спасибо, что тянешь. я это вижу. ты важен(важна).`,
};

const YELLS = [
  "Мне плевать на ваш «синк»",
  "Хватит двигать дедлайны",
  "Я не ваш личный пожарный",
  "Нормально ставьте задачи",
  "Хватит обесценивать",
  "Я устал(а) спасать чужой бардак",
  "Это не срочно — это ваша тревога",
  "Перестаньте писать в 23:40",
  "Моя работа — не угадывать мысли",
  "Довольно микровмешательства",
];

const state = {
  name: "Руководитель",
  tone: null,
  steam: 100,
  replyCount: 0,
  finaleStarted: false,
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function show(id) {
  ["setup", "chat", "finale"].forEach((key) => {
    $(`#${key}`).hidden = key !== id;
  });
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scrollThread() {
  const t = $("#thread");
  t.scrollTop = t.scrollHeight;
}

function addBubble(text, who, extraClass = "") {
  const el = document.createElement("div");
  el.className = `bubble ${who}${extraClass ? ` ${extraClass}` : ""}`;
  el.textContent = text;
  $("#thread").appendChild(el);
  scrollThread();
  return el;
}

function setSteam(n) {
  state.steam = Math.max(0, Math.min(100, n));
  $("#steamBar").style.width = `${state.steam}%`;
}

function setStatus(text, cls = "") {
  const el = $("#whoStatus");
  el.textContent = text;
  el.className = `who-status ${cls}`.trim();
}

function renderTones() {
  const box = $("#tones");
  box.innerHTML = "";
  TONES.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tone" + (state.tone === t.id ? " active" : "");
    btn.innerHTML = `<strong>${t.title}</strong><span>${t.blurb}</span>`;
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

function openChat() {
  state.name = $("#bossName").value.trim() || "Руководитель";
  state.steam = 100;
  state.replyCount = 0;
  state.finaleStarted = false;
  setSteam(100);
  $("#whoName").textContent = state.name;
  const tone = TONES.find((t) => t.id === state.tone);
  setStatus(tone?.status || "онлайн · private", "busy");
  $("#thread").innerHTML = "";
  addBubble("Канал private · сообщения не покидают устройство", "system");
  addBubble(`Привет. На связи.`, "boss");
  show("chat");
  $("#msgInput").focus();
}

function sendYou(text) {
  const msg = text.trim();
  if (!msg || state.finaleStarted) return;
  addBubble(msg, "you", "yell");
  setSteam(state.steam - rand([8, 10, 12, 14]));
  $("#msgInput").value = "";
  scheduleBossReply();
  if (state.steam <= 18) {
    setTimeout(() => startFinale(false), 900);
  }
}

function scheduleBossReply() {
  const delay =
    state.tone === "silent" ? rand([1200, 1800, 2400, 3200]) : rand([600, 900, 1200, 1500]);
  setStatus("печатает…", "typing");
  setTimeout(() => {
    if (state.finaleStarted) return;
    const line = rand(REPLIES[state.tone] || REPLIES.passive);
    addBubble(line, "boss");
    state.replyCount += 1;
    const tone = TONES.find((t) => t.id === state.tone);
    setStatus(tone?.status || "онлайн", "busy");
  }, delay);
}

function startFinale(manual) {
  if (state.finaleStarted) return;
  state.finaleStarted = true;
  setStatus("печатает…", "typing");
  addBubble("— пауза в канале —", "system");

  setTimeout(() => {
    const sorry = APOLOGY[state.tone](state.name);
    addBubble(sorry, "boss", "apology");
    setStatus("онлайн", "");
  }, 1100);

  setTimeout(() => {
    const praise = PRAISE[state.tone](state.name);
    addBubble(praise, "boss", "apology");
  }, 2400);

  setTimeout(() => {
    setSteam(0);
    const quotes = $("#finaleQuotes");
    quotes.innerHTML = "";
    const a = document.createElement("div");
    a.className = "bubble boss apology";
    a.textContent = APOLOGY[state.tone](state.name);
    const b = document.createElement("div");
    b.className = "bubble boss apology";
    b.textContent = PRAISE[state.tone](state.name);
    quotes.append(a, b);
    $("#finaleTitle").textContent = manual ? "Извинения получены" : "Пар вышел";
    $("#finaleKicker").textContent = "0 сообщений отправлено · private";
    show("finale");
  }, 3800);
}

$("#bossName").addEventListener("input", syncStart);
$("#startBtn").addEventListener("click", openChat);
$("#backBtn").addEventListener("click", () => {
  state.finaleStarted = true;
  show("setup");
});
$("#sendForm").addEventListener("submit", (e) => {
  e.preventDefault();
  sendYou($("#msgInput").value);
});
$("#enoughBtn").addEventListener("click", () => startFinale(true));
$("#againBtn").addEventListener("click", openChat);
$("#homeBtn").addEventListener("click", () => show("setup"));

renderTones();
renderYells();
show("setup");

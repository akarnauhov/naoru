/**
 * Переводчик с мата на корпоративный.
 * Берёт ор → собирает письмо «Уважаемые коллеги…».
 */

const MAT_STRIP =
  /(?:ебтвою|ёбтвою|еб\s*твою|мать|мамку|хуй|хуя|хуе|хуё|нахуй|нахуя|пизд|бля(?:ть|дь)?|ёб|еба|ебу|ёба|сука|охуе|охуи|пиздец|заеб|заёб|мудак|мудил|говно|дерьмо|хер|чмо|долбо[её]б|доолбаеб|далбаеб|дебил|идиот|кретин|тварь|падала|гандон)/gi;

const SIGNAL_RULES = [
  {
    id: "deadline_eod",
    re: /до конца дня|к концу дня|сегодня|eod|до вечера/i,
    bit: "задача должна была быть выполнена до конца дня",
  },
  {
    id: "deadline_general",
    re: /срок|дедлайн|deadline|к пятниц|к понедельник|к завтра/i,
    bit: "срок, о котором мы договаривались, уже наступил",
  },
  {
    id: "said_yesterday",
    re: /вчера|уже говорил|я сказал|я сказала|мы договаривал/i,
    bit: "вчера мы фиксировали договорённость по сроку",
  },
  {
    id: "not_ready",
    re: /не готов|не сделан|не сдан|где результат|ещё не|еще не|до сих пор/i,
    bit: "на текущий момент готовность неочевидна",
  },
  {
    id: "night",
    re: /ноч|23:|00:|после десяти|в выходн/i,
    bit: "рабочая коммуникация лучше укладывается в рабочие часы",
  },
  {
    id: "meeting",
    re: /созвон|митинг|синк|standup|стендап/i,
    bit: "хотелось бы сократить количество созвонов без конкретной цели",
  },
  {
    id: "load",
    re: /на мне|всё на|все на|перегруз|загруз|пожарн|спаса/i,
    bit: "нагрузка сейчас распределена неравномерно",
  },
  {
    id: "money",
    re: /зарплат|деньг|оплат|преми|зп\b/i,
    bit: "вопрос по компенсации требует отдельного конструктивного разговора",
  },
  {
    id: "respect",
    re: /обесцен|игнор|не слыш|уважен/i,
    bit: "важно сохранять уважительный тон в рабочих обсуждениях",
  },
  {
    id: "chaos",
    re: /бардак|хаос|кавардак|процесс/i,
    bit: "в процессах сейчас много неопределённости",
  },
  {
    id: "competence",
    re: /долб|дебил|идиот|туп|чтоли|что ли|неможет|не может/i,
    bit: "есть ощущение, что договорённости исполняются недостаточно внимательно",
  },
  {
    id: "urgent",
    re: /какого|почему|где|когда будет|asap|срочн/i,
    bit: "нужен актуальный статус и понятный ETA",
  },
];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function signalsOf(text) {
  return SIGNAL_RULES.filter((r) => r.re.test(text || "")).map((r) => r);
}

function heatHint(text) {
  const mats = (text || "").match(MAT_STRIP);
  return mats ? mats.length : 0;
}

function opener(heat) {
  if (heat >= 3) {
    return rand([
      "Уважаемые коллеги,",
      "Коллеги, добрый день.",
      "Добрый день, команда.",
    ]);
  }
  return rand([
    "Уважаемые коллеги,",
    "Коллеги,",
    "Добрый день,",
  ]);
}

function askLine(signals) {
  const ids = new Set(signals.map((s) => s.id));
  if (ids.has("not_ready") || ids.has("deadline_eod") || ids.has("deadline_general") || ids.has("urgent")) {
    return rand([
      "Подскажите, пожалуйста, на каком этапе сейчас работа и когда можно ожидать готовности?",
      "Буду признателен(а) за короткий статус: что уже сделано и какой реалистичный срок сдачи?",
      "Прошу подтвердить актуальный ETA и риски, если они есть.",
    ]);
  }
  if (ids.has("meeting")) {
    return "Давайте зафиксируем цель следующей встречи и нужных участников — иначе рискуем тратить время впустую.";
  }
  if (ids.has("load")) {
    return "Предлагаю пересмотреть распределение задач, чтобы сроки оставались реалистичными.";
  }
  if (ids.has("money")) {
    return "Готов(а) обсудить это в отдельном созвоне или письме — без эмоций, по фактам.";
  }
  return rand([
    "Буду рад(а) услышать ваш взгляд и следующий шаг.",
    "Давайте синхронизируемся по ожиданиям и срокам.",
    "Прошу вернуться с коротким статусом, чтобы мы могли двигаться дальше.",
  ]);
}

function softenCore(text) {
  return String(text || "")
    .replace(MAT_STRIP, " ")
    .replace(/[!]{2,}/g, ".")
    .replace(/\?{2,}/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function translateMat(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return {
      text: "",
      empty: true,
    };
  }

  const heat = heatHint(text);
  const signals = signalsOf(text);
  const bits = [];
  const seen = new Set();

  signals.forEach((s) => {
    if (seen.has(s.bit)) return;
    seen.add(s.bit);
    bits.push(s.bit);
  });

  // если сигналов мало — вытащим «смысл» из очищенного текста
  const clean = softenCore(text);
  if (bits.length === 0 && clean.length > 8) {
    const short = clean.length > 110 ? clean.slice(0, 110).replace(/\s+\S*$/, "") + "…" : clean;
    bits.push(`по сути речь о следующем: ${short.charAt(0).toLowerCase()}${short.slice(1)}`);
  }

  if (bits.length === 0) {
    bits.push("есть важный рабочий вопрос, который лучше проговорить спокойно и по делу");
  }

  // собрать 1–2 факта
  let facts;
  if (bits.length === 1) {
    facts = `Хочу вернуться к договорённости: ${bits[0]}.`;
  } else if (bits.length === 2) {
    facts = `Напомню: ${bits[0]}. При этом ${bits[1]}.`;
  } else {
    facts = `Напомню ключевое: ${bits[0]}; также ${bits[1]}.`;
  }

  // лёгкий «я-месседж» вместо ора
  const frame = heat >= 2
    ? rand([
        "Пишу спокойно, хотя ситуация напрягает.",
        "Сформулирую без эмоций, чтобы было проще ответить по сути.",
        "Давайте останемся в рабочем тоне.",
      ])
    : rand([
        "Хочу уточнить статус.",
        "Нужна ясность по ожиданиям.",
        "Прошу помочь закрыть вопрос.",
      ]);

  const ask = askLine(signals).replace("признателен(а)", "признателен").replace("рад(а)", "рад").replace("Готов(а)", "Готов");

  const closing = rand([
    "Спасибо.",
    "Заранее спасибо.",
    "Буду ждать ответ.",
  ]);

  const body = [opener(heat), frame, facts, ask, closing].join("\n\n");

  return {
    text: body,
    empty: false,
    heat,
    signals: signals.map((s) => s.id),
  };
}

/** Версия с учётом пола для «признателен/а» и т.п. */
function translateMatGendered(raw, gender) {
  const out = translateMat(raw);
  if (!out.text) return out;
  let t = out.text;
  if (gender === "f") {
    t = t
      .replace(/Буду признателен/g, "Буду признательна")
      .replace(/Буду рад /g, "Буду рада ")
      .replace(/Готов обсудить/g, "Готова обсудить");
  }
  return { ...out, text: t };
}

window.NaoruTranslator = { translateMat, translateMatGendered };

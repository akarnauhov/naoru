/**
 * Контекстный «мозг» босса: разбирает смысл, тон, историю.
 * Без кавычек в тексте — ответ как reply в Telegram (превью отдельно).
 */

const MAT_RE =
  /(?:ху[йеёяю]|хули|пизд|бля|блять|бляд|ёб|еба|ебу|ёба|сука|нахуй|нахуя|охуе|охуи|пиздец|заеб|заёб|мудак|мудил|говно|дерьмо|хер|чмо|далбаеб|долбоёб)/i;

const TOPIC_RULES = [
  { id: "deadline", re: /срок|дедлайн|deadline|горят|сдвиг|перенос|горит/i },
  { id: "money", re: /зарплат|деньг|оплат|преми|оклад|зп\b|копееч/i },
  { id: "night", re: /ноч|вечером|23:|00:|выходн|после десяти|в 10|поздно/i },
  { id: "meeting", re: /созвон|митинг|встреч|синк|standup|стендап|созвон/i },
  { id: "respect", re: /уважен|обесцен|игнор|не слыш|плевать|пофиг|не цен/i },
  { id: "load", re: /загруз|перегруз|выгоран|устало|сил нет|много задач|тянут|спасат/i },
  { id: "micromanage", re: /контрол|микро|в затылок|статус кажд|скрины|дыш/i },
  { id: "chaos", re: /бардак|хаос|кавардак|процесс|пожар|хаос/i },
  { id: "fireman", re: /пожарн|туш|спасаю|спасат|герой/i },
  { id: "urgent", re: /срочн|asap|горит|горит|вчера надо/i },
];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pick(arr, used) {
  const free = arr.filter((x) => !used.has(x));
  const pool = free.length ? free : arr;
  const x = rand(pool);
  used.add(x);
  return x;
}

function heatOf(text) {
  const t = text || "";
  let h = 0;
  if (MAT_RE.test(t)) h += 2;
  if (/[!?]{2,}|\.{3}|…/.test(t)) h += 1;
  if (t.length > 90) h += 1;
  if (/всегда|никогда|хватит|достал|ненавиж|плевать|какого хуя/i.test(t)) h += 1;
  return Math.min(4, h);
}

function topicsOf(text) {
  return TOPIC_RULES.filter((r) => r.re.test(text || "")).map((r) => r.id);
}

function intentOf(text) {
  const t = text || "";
  if (/\?/.test(t)) return "ask";
  if (/хватит|перестань|хватит|не надо|прекрати/i.test(t)) return "demand";
  if (/я не|мне не|я устал|я не ваш|мне плевать/i.test(t)) return "boundary";
  if (MAT_RE.test(t) || /пиздец|кошмар|ужас/i.test(t)) return "rant";
  return "vent";
}

function previewBit(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= 48) return clean;
  const cut = clean.slice(0, 48);
  const sp = cut.lastIndexOf(" ");
  return (sp > 20 ? cut.slice(0, sp) : cut).trim() + "…";
}

function matSpice(level, tone) {
  if (level < 2) return "";
  const soft = ["чёрт", "блин", "ёлки"];
  const mid = ["блин", "чёрт возьми", "да е-мое"];
  const hard = ["бля", "да блять", "ну нахуй", "пиздец"];
  const bossHard = ["бля", "да какого хуя", "пиздец", "сука"];
  if (tone === "bureaucrat") return level >= 3 ? rand(soft) : "";
  if (tone === "silent") return level >= 3 ? rand(["бля", "пиздец", "ок блять"]) : "";
  if (tone === "toxic") return level >= 3 ? rand(mid.concat(["офигеть"])) : rand(soft);
  if (level >= 3) return rand(bossHard);
  if (level >= 2) return rand(mid);
  return rand(soft);
}

function withMat(sentence, spice) {
  if (!spice) return sentence;
  const s = sentence.replace(/\s+$/, "");
  const lower = s.charAt(0).toLowerCase() + s.slice(1);
  return rand([
    () => `${spice}, ${lower}`,
    () => (s.endsWith(".") || s.endsWith("?") || s.endsWith("!") ? `${s.slice(0, -1)} — ${spice}.` : `${s} — ${spice}.`),
    () => `${s} ${spice}.`,
  ])();
}

function topicCue(topic) {
  const map = {
    deadline: ["сроки", "дедлайны", "даты"],
    money: ["деньги", "оплату", "зп"],
    night: ["ночные сообщения", "поздние пинги", "вечерние пинги"],
    meeting: ["созвоны", "митинги", "синки"],
    respect: ["тон", "уважение", "обесценивание"],
    load: ["нагрузку", "объём", "перегруз"],
    micromanage: ["контроль", "статусы", "микроменеджмент"],
    chaos: ["бардак", "хаос", "процессы"],
    fireman: ["пожары", "тушение", "героизм"],
    urgent: ["срочность", "asap", "горит"],
    general: ["это", "ситуацию", "тему"],
  };
  return rand(map[topic] || map.general);
}

function historyHints(history, topic) {
  const boss = history.filter((m) => m.role === "boss").slice(-5);
  const users = history.filter((m) => m.role === "user");
  const sameTopic = users.filter((m) => topicsOf(m.text).includes(topic)).length;
  return {
    rounds: users.length,
    sameTopic,
    bossSaidSoft: boss.some((m) => /изви|сорри|слышал|понял/i.test(m.text)),
    stuck: sameTopic >= 2,
  };
}

function gf(gender, m, f) {
  return gender === "f" ? f : m;
}

function craftBossReply({ tone, gender, userText, history }) {
  const t = tone || "passive";
  const sex = gender === "f" ? "f" : "m";
  const heat = heatOf(userText);
  const topics = topicsOf(userText);
  const topic = topics[0] || "general";
  const intent = intentOf(userText);
  const spice = matSpice(heat, t);
  const hints = historyHints(history || [], topic);
  const used = new Set((history || []).filter((m) => m.role === "boss").slice(-6).map((m) => m.text));

  const builders = {
    passive: buildPassive,
    toxic: buildToxic,
    bureaucrat: buildBureaucrat,
    gaslight: buildGaslight,
    micro: buildMicro,
    kpi: buildKpi,
    silent: buildSilent,
  };

  const fn = builders[t] || buildPassive;
  let line = fn({ topic, heat, intent, hints, used, gender: sex });
  if (heat >= 2 && t !== "silent") line = withMat(line, spice);
  if (used.has(line)) {
    line = fn({ topic, heat: Math.min(4, heat + 1), intent, hints, used, gender: sex, alt: true });
    if (heat >= 2 && t !== "silent") line = withMat(line, spice);
  }

  return {
    text: line,
    replyTo: previewBit(userText),
  };
}

function buildPassive({ topic, heat, intent, hints, used, gender, alt }) {
  const cue = topicCue(topic);
  const openers = [];

  if (hints.stuck) {
    openers.push(
      `Ок, возвращаемся к ${cue}. Я уже понял, что это не разовый всплеск.`,
      `Снова про ${cue}. Значит, правда давит — не отмажусь одной фразой.`
    );
  }

  if (intent === "demand") {
    openers.push(
      `Слышу стоп. По ${cue} давай договоримся нормально, без оперы.`,
      `Стоп принят. Дальше по ${cue} — конкретнее, что меняем.`
    );
  } else if (intent === "boundary") {
    openers.push(
      `Граница ясна. Не буду делать вид, что ${cue} — это «просто так вышло».`,
      `Ок, ты не ${gf(gender, "пожарный", "пожарная")}. По ${cue} перераспределим, а не «ну ты же справишься».`
    );
  } else if (intent === "ask") {
    openers.push(
      `Спрашиваешь — отвечаю: по ${cue} я был кривой. Давай пересоберём.`,
      `Вопрос услышал. По ${cue} виноват в том, как это выглядело с твоей стороны.`
    );
  } else if (heat >= 3) {
    openers.push(
      `Ор услышал. Больше похоже на накопленное, чем на один срыв по ${cue}.`,
      `Жёстко. Не буду спорить тоном — по ${cue} претензия по существу.`
    );
  } else {
    openers.push(
      `Принял. Про ${cue} звучит неприятно — и, похоже, заслуженно.`,
      `Ок. Тон оставляю тебе, по ${cue} разберёмся отдельно.`,
      `Услышал. Не буду делать вид, что ${cue} — мелочь.`,
      `Зафиксировал. Если ${cue} бесит именно так — значит, системно.`
    );
  }

  if (alt) openers.push(`Ладно. Без сарказма: по ${cue} надо менять подход.`);
  return pick(openers, used);
}

function buildToxic({ topic, heat, intent, hints, used }) {
  const cue = topicCue(topic);
  const lines = [];

  if (intent === "boundary" || intent === "demand") {
    lines.push(
      `Огонь! Давай эту энергию завернём в win по ${cue} 🔥`,
      `Люблю, когда граница есть. Теперь ${cue} — наш челлендж на рост.`
    );
  }
  if (hints.stuck) {
    lines.push(`Снова ${cue}? Значит, зона роста ещё горячая. Кайф, работаем.`);
  }
  lines.push(
    heat >= 2
      ? `Жжёшь. Мне даже нравится. Теперь ярость — в результат, а не в чат.`
      : `Чувствую драйв. По ${cue} как раз можно вырасти как команда.`,
    `Мы одна команда. И ${cue} мы вместе переварим — ты же сильнее этого.`,
    `Вау, пассионарность. Без тебя ${cue} бы вообще не взлетели.`
  );
  return pick(lines, used);
}

function buildBureaucrat({ topic, intent, hints, used }) {
  const cue = topicCue(topic);
  const lines = [
    `По ${cue} нужна задача в трекере. Иначе эскалации нет.`,
    `Принято. Жду письмо: факты, желаемое решение, срок. Только так.`,
    `Согласно процессу: сначала тикет по ${cue}, потом разбор.`,
    `Внесу в протокол. Без фиксации разговор юридически как бы не случился.`,
  ];
  if (intent === "rant" || intent === "demand") {
    lines.push(`Эмоциональный фон учтён. По ${cue} всё равно нужен тикет до EOD.`);
  }
  if (hints.stuck) {
    lines.push(`Повторное обращение по ${cue}. Открою эскалацию после письменной заявки.`);
  }
  return pick(lines, used);
}

function buildGaslight({ topic, heat, intent, hints, used, gender }) {
  const cue = topicCue(topic);
  const lines = [
    `Мне кажется, ты ${gf(gender, "накрутил", "накрутила")} историю про ${cue}.`,
    `Странно. Обычно ты спокойнее про ${cue} говоришь.`,
    `Никто тебя жёстко не ставил по ${cue}. Ты ${gf(gender, "сам так решил", "сама так решила")}.`,
    `Давай без театра. Перечитай спокойно — и станет яснее.`,
  ];
  if (heat >= 2) {
    lines.push(`Ор — не аргумент. По ${cue} давай факты, не восприятие.`);
  }
  if (intent === "ask") {
    lines.push(`Ты сейчас ищешь подтверждение своей версии. Это уже не про ${cue}.`);
  }
  if (hints.stuck) {
    lines.push(`Опять то же самое? Может, дело не в ${cue}, а в том, как ты это читаешь.`);
  }
  return pick(lines, used);
}

function buildMicro({ topic, heat, intent, hints, used }) {
  const cue = topicCue(topic);
  const lines = [
    `Ок. Скинь цифры: что горит по ${cue} прямо сейчас.`,
    `Не расплываемся. ETA, риски, что сделано за час — по ${cue}.`,
    `Чеклист и апдейт через 30 минут. Потом уже про чувства.`,
    `Я сам гляну, где затык. Короткий статус — и разложу по шагам.`,
  ];
  if (heat >= 2) {
    lines.push(`Слышу ярость. Всё равно: статус пунктами. Сейчас.`);
  }
  if (intent === "boundary") {
    lines.push(`Границу услышал. Контроль сниму после нормального статуса по ${cue}.`);
  }
  if (hints.stuck) {
    lines.push(`Тема ${cue} уже второй круг. Дай факты — закроем или эскалируем.`);
  }
  return pick(lines, used);
}

function buildKpi({ topic, heat, intent, hints, used }) {
  const cue = topicCue(topic);
  const lines = [
    `Ок, эмоции later. Какие цифры по ${cue} за этот спринт?`,
    `Без KPI разговор пустой. Покажи метрику по ${cue} — и поговорим.`,
    `Я смотрю на дашборд. Где дельта по ${cue}? Цель / факт / gap.`,
    `Эффективность = измеримость. По ${cue} нужен один ключевой показатель и тренд.`,
  ];
  if (heat >= 2) {
    lines.push(`Слышу пар. Всё равно: KPI по ${cue} и комментарий в одну строку.`);
  }
  if (intent === "boundary" || intent === "demand") {
    lines.push(`Границу принял. Но без цифр по ${cue} я не могу защитить ресурс наверху.`);
  }
  if (hints.stuck) {
    lines.push(`Снова ${cue} без цифр. Давай закроем метрикой, иначе крутимся.`);
  }
  return pick(lines, used);
}

function buildSilent({ topic, heat, intent, used }) {
  if (heat >= 3) {
    return pick(["понял. жёстко", "ок блять", "пиздец. услышал", "мм. разберёмся", "да бля. ок"], used);
  }
  if (heat >= 2) {
    return pick(["ок", "понял", "видно", "принято", "угу"], used);
  }
  if (intent === "ask") {
    return pick(["позже", "не сейчас", "напишу", "ок"], used);
  }
  const short = {
    deadline: ["срок ок", "сдвинем?", "позже по сроку", "гляну дедлайн"],
    money: ["не здесь", "в HR", "потом", "не в чате"],
    night: ["увидел", "сорри ночью", "ок", "больше не так"],
    meeting: ["созвон позже", "слот кину", "ок", "без синка"],
    respect: ["услышал", "ок", "понял", "принято"],
    load: ["много да", "урежем", "ок", "снимем"],
    micromanage: ["ладно", "отстану", "ок", "без статусов"],
    chaos: ["да бардак", "починим", "ок", "разберём"],
    fireman: ["не надо", "снимем", "ок", "хватит"],
    urgent: ["не asap", "реально?", "ок", "приоритет гляну"],
    general: ["ок", "в работе", "ага", "видно", "угу"],
  };
  return pick(short[topic] || short.general, used);
}

window.NaoruBrain = { craftBossReply, heatOf, MAT_RE };

/**
 * Контекстный «мозг» босса: не чистый LLM, но отвечает по смыслу реплики,
 * истории чата и уровню мата. Работает офлайн на GitHub Pages.
 */

const MAT_RE =
  /(?:ху[йеёяю]|хули|пизд|бля|блять|бляд|ёб|еба|ебу|ёба|сука|нахуй|нахуя|охуе|охуи|пиздец|заеб|заёб|мудак|мудил|говно|дерьмо|хер|чмо|далбаеб|долбоёб)/i;

const TOPIC_RULES = [
  { id: "deadline", re: /срок|дедлайн|deadline|горят|сдвиг|перенос/i, label: "сроки" },
  { id: "money", re: /зарплат|деньг|оплат|преми|оклад|зп\b/i, label: "деньги" },
  { id: "night", re: /ноч|вечером|23:|00:|выходн|в 10|после десяти/i, label: "внеурочка" },
  { id: "meeting", re: /созвон|митинг|встреч|синк|standup|стендап/i, label: "созвоны" },
  { id: "respect", re: /уважен|обесцен|игнор|не слыш|плевать|пофиг/i, label: "уважение" },
  { id: "load", re: /загруз|перегруз|выгоран|устало|сил нет|много задач/i, label: "нагрузка" },
  { id: "micromanage", re: /контрол|микро|в затылок|статус кажды|скрины/i, label: "контроль" },
  { id: "chaos", re: /бардак|хаос|бардак|процесс|кавардак|бардак/i, label: "хаос" },
];

function heatOf(text) {
  const t = text || "";
  let h = 0;
  if (MAT_RE.test(t)) h += 2;
  if (/[!?]{2,}|\.\.\./.test(t)) h += 1;
  if (t.length > 80) h += 1;
  if (/всегда|никогда|хватит|достал|ненавиж/i.test(t)) h += 1;
  return Math.min(4, h);
}

function topicsOf(text) {
  return TOPIC_RULES.filter((r) => r.re.test(text || "")).map((r) => r.id);
}

function quoteBit(text) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length < 4) return "";
  let bit = clean;
  if (bit.length > 42) {
    const cut = bit.slice(0, 42);
    const sp = cut.lastIndexOf(" ");
    bit = (sp > 18 ? cut.slice(0, sp) : cut).trim() + "…";
  }
  return bit;
}

function matSpice(level, tone) {
  if (level < 2) return "";
  const soft = ["чёрт", "блин", "ёлки"];
  const mid = ["блин", "чёрт возьми", "да е-мое", "ну ё-моё"];
  const hard = ["бля", "да блять", "ну нахуй", "пиздец", "ёбаный в рот"];
  const bossHard = ["бля", "да какого хуя", "пиздец", "ну ёб твою", "сука"];
  if (tone === "bureaucrat") return level >= 3 ? rand(soft) : "";
  if (tone === "silent") return level >= 3 ? rand(["бля", "пиздец", "ок блять"]) : "";
  if (tone === "toxic") return level >= 3 ? rand(mid.concat(["офигеть", "жесть"])) : rand(soft);
  if (level >= 3) return rand(bossHard);
  if (level >= 2) return rand(mid);
  return rand(soft);
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function withMat(sentence, spice) {
  if (!spice) return sentence;
  const forms = [
    () => `${spice}, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`,
    () => `${sentence} ${spice}.`,
    () => `${sentence.slice(0, -1)} — ${spice}.`,
  ];
  return rand(forms)();
}

function craftBossReply({ tone, userText, history }) {
  const t = tone || "passive";
  const heat = heatOf(userText);
  const topics = topicsOf(userText);
  const q = quoteBit(userText);
  const prevUser = [...history].reverse().find((m) => m.role === "user" && m.text !== userText);
  const spice = matSpice(heat, t);
  const topic = topics[0] || "general";

  const builders = {
    passive: buildPassive,
    toxic: buildToxic,
    bureaucrat: buildBureaucrat,
    gaslight: buildGaslight,
    micro: buildMicro,
    silent: buildSilent,
  };

  const fn = builders[t] || buildPassive;
  let line = fn({ userText, q, topic, heat, prevUser, history });
  if (heat >= 2) line = withMat(line, spice);

  // антиповтор последних ответов босса
  const recentBoss = history.filter((m) => m.role === "boss").slice(-4).map((m) => m.text);
  if (recentBoss.includes(line)) {
    line = fn({ userText, q, topic, heat: heat + 1, prevUser, history, alt: true });
    if (heat >= 2) line = withMat(line, spice);
  }
  return line;
}

function aboutTopic(topic) {
  const map = {
    deadline: "сроки",
    money: "деньги",
    night: "ночные сообщения",
    meeting: "созвоны",
    respect: "тон общения",
    load: "нагрузку",
    micromanage: "контроль",
    chaos: "бардак в процессах",
    general: "это",
  };
  return map[topic] || "это";
}

function buildPassive({ q, topic, heat, alt }) {
  const about = aboutTopic(topic);
  const lines = [
    q ? `Про «${q}» — понял. Жаль, что именно так это звучит.` : `Услышал. Особенно про ${about}.`,
    q ? `Ок. «${q}» — это ты сейчас на эмоциях или давно копилось?` : `Забавно, что ${about} всплывает именно сегодня.`,
    `Я услышал претензию по ${about}. Тон оставляю на твоей совести.`,
    heat >= 2
      ? `Ну ок, орёшь — значит болит. По ${about} давай отдельно, без этой оперы.`
      : `Зафиксировал недовольство по ${about}. Будем считать диалог состоявшимся.`,
  ];
  if (alt) lines.push(`С ${about} разберёмся. С криком — как умеешь.`);
  return rand(lines);
}

function buildToxic({ q, topic, heat }) {
  const about = aboutTopic(topic);
  const lines = [
    q
      ? `Вау, «${q}» — вот это пассionalность! Давай завернём ${about} в win.`
      : `Чувствую огонь! По ${about} как раз можно вырасти.`,
    heat >= 2
      ? `Жжёшь. Мне даже нравится. Теперь эту ярость — в результат по ${about}.`
      : `Люблю, когда не всё равно. ${about[0].toUpperCase()}${about.slice(1)} — наш челлендж.`,
    q ? `«${q}» — сильно сказано. Команда такое переживёт и станет крепче.` : `Мы команда. И ${about} мы вместе переварим.`,
  ];
  return rand(lines);
}

function buildBureaucrat({ q, topic }) {
  const about = aboutTopic(topic);
  const lines = [
    q
      ? `По формулировке «${q}» нужна задача в трекере. Иначе не эскалирую.`
      : `Вопрос по ${about} — только через тикет и статус до EOD.`,
    `Принято. По ${about} жду письмо с темой, фактами и желаемым решением.`,
    q
      ? `«${q}» внесу в протокол. Без протокола разговор как бы не случился.`
      : `Согласно процессу: сначала фиксация по ${about}, потом разбор.`,
  ];
  return rand(lines);
}

function buildGaslight({ q, topic, heat }) {
  const about = aboutTopic(topic);
  const lines = [
    q
      ? `Ты сейчас слишком остро про «${q}». Я такого жёстко не ставил.`
      : `Мне кажется, ты накрутил(а) историю про ${about}.`,
    heat >= 2
      ? `Ор — не аргумент. По ${about} давай без театра, факты.`
      : `Странно. Обычно ты спокойнее про ${about} говоришь.`,
    q
      ? `«${q}» — это уже интерпретация. Перечитай, пожалуйста, без эмоций.`
      : `Никто тебя не прессовал по ${about}. Ты сам(а) так решил(а).`,
  ];
  return rand(lines);
}

function buildMicro({ q, topic, heat }) {
  const about = aboutTopic(topic);
  const lines = [
    q
      ? `Ок, «${q}». Скинь скрин/цифры: что горит по ${about} прямо сейчас.`
      : `По ${about} нужен ETA, риски и что сделано за последний час.`,
    heat >= 2
      ? `Слышу ярость. Всё равно: статус по ${about} пунктами. Сейчас.`
      : `Давай не расплывёмся. Чеклист по ${about} и апдейт через 30 минут.`,
    q
      ? `Понял сигнал «${q}». Открою задачу и сам гляну, где затык.`
      : `Я подключусь к ${about} и разложу по шагам. Пиши короткий статус.`,
  ];
  return rand(lines);
}

function buildSilent({ q, topic, heat }) {
  if (heat >= 3) {
    return rand([
      q ? `понял. «${q}» — жёстко` : "понял. жёстко",
      "ок блять",
      "пиздец. услышал",
      "мм. разберёмся",
    ]);
  }
  if (heat >= 2) {
    return rand(["ок", "понял", "видно", q ? `про «${q}» — ок` : "принято"]);
  }
  const short = {
    deadline: ["срок ок", "сдвинем?", "позже по сроку"],
    money: ["не здесь", "в HR", "потом"],
    night: ["увидел", "сорри ночью", "ок"],
    meeting: ["созвон позже", "слот кину", "ок"],
    respect: ["услышал", "ок", "понял"],
    load: ["много да", "урежем", "ок"],
    micromanage: ["ладно", "отстану", "ок"],
    chaos: ["да бардак", "починим", "ок"],
    general: ["ок", "в работе", "ага", "видно"],
  };
  return rand(short[topic] || short.general);
}

window.NaoruBrain = { craftBossReply, heatOf, MAT_RE };

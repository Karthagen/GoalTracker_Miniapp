export const STORAGE_KEY = "circleup.v2";
export const COLORS = [
  "#e58b51",
  "#879b71",
  "#9690c2",
  "#6d9ead",
  "#d1ad56",
  "#cf8698",
];
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function fromKey(key) {
  return new Date(`${key}T12:00:00`);
}
export function shiftDay(key, amount) {
  const date = fromKey(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}
export function daysBetween(start, end) {
  const utc = (key) =>
    Date.UTC(...key.split("-").map((n, i) => Number(n) - (i === 1 ? 1 : 0)));
  return Math.round((utc(end) - utc(start)) / 86400000);
}
export function activeSubs(goal, day) {
  return goal.subgoals.filter(
    (s) => s.createdAt <= day && (!s.archivedAt || day < s.archivedAt),
  );
}
export function dayProgress(goal, day) {
  if (day < goal.createdAt) return { done: 0, total: 0, percent: 0 };
  const subs = activeSubs(goal, day);
  const marked = new Set(goal.history[day] || []);
  const done = subs.filter((s) => marked.has(s.id)).length;
  return {
    done,
    total: subs.length,
    percent: subs.length ? Math.round((done / subs.length) * 100) : 0,
  };
}
export function toggleDay(goal, day, id) {
  const before = goal.history[day] || [];
  return {
    ...goal,
    history: {
      ...goal.history,
      [day]: before.includes(id)
        ? before.filter((x) => x !== id)
        : [...before, id],
    },
  };
}
export function statistics(goal, today, period = 30) {
  const days = Array.from({ length: period }, (_, i) => ({
    date: shiftDay(today, i - period + 1),
    ...dayProgress(goal, shiftDay(today, i - period + 1)),
  }));
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const done = days.reduce((sum, day) => sum + day.done, 0);
  let streak = 0;
  let cursor =
    dayProgress(goal, today).percent === 100 ? today : shiftDay(today, -1);
  while (
    cursor >= goal.createdAt &&
    dayProgress(goal, cursor).percent === 100
  ) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return {
    days,
    done,
    consistency: total ? Math.round((done / total) * 100) : 0,
    streak,
    perfect: days.filter((d) => d.total && d.percent === 100).length,
  };
}
export function normalizeGoal(raw, today) {
  const createdAt = /^\d{4}-\d{2}-\d{2}$/.test(raw.createdAt)
    ? raw.createdAt
    : today;
  const subgoals = (Array.isArray(raw.subgoals) ? raw.subgoals : [])
    .filter((s) => s && typeof s.label === "string")
    .map((s, i) => ({
      id: String(s.id ?? `migrated-${i}`),
      label: s.label,
      note: s.note || "",
      color: /^#[\da-f]{6}$/i.test(s.color)
        ? s.color
        : COLORS[i % COLORS.length],
      icon: s.icon || ["walk", "book", "water", "sun", "moon"][i % 5],
      createdAt: s.createdAt || createdAt,
      archivedAt: s.archivedAt || null,
    }));
  const history = Object.fromEntries(
    Object.entries(raw.history || {})
      .filter(
        ([key, ids]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && Array.isArray(ids),
      )
      .map(([key, ids]) => [key, ids.map(String)]),
  );
  if (!raw.history)
    history[today] = (raw.subgoals || [])
      .filter((s) => s.completed)
      .map((s) => String(s.id));
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    mainGoal: raw.mainGoal || "Моя цель",
    description: raw.description || "",
    createdAt,
    subgoals,
    history,
  };
}
export function loadData(today) {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const stored = current
      ? JSON.parse(current)
      : {
          goals: JSON.parse(localStorage.getItem("goals") || "[]"),
          lang: localStorage.getItem("lang"),
        };
    return migrateSingleGoal(stored, today);
  } catch {
    return { goal: null, archivedGoals: [], lang: "ru", error: true };
  }
}

// Keep older, additional goals in an exportable archive, never as active goals.
export function migrateSingleGoal(stored, today) {
  const archivedGoals = Array.isArray(stored.archivedGoals)
    ? [...stored.archivedGoals]
    : [];
  let goal = null;
  if (Object.hasOwn(stored, "goal")) {
    if (stored.goal !== null && typeof stored.goal !== "object")
      throw new Error("Invalid goal");
    goal = stored.goal ? normalizeGoal(stored.goal, today) : null;
  } else {
    if (!Array.isArray(stored.goals)) throw new Error("Invalid goals");
    const legacy = stored.goals.filter((g) => g && typeof g === "object");
    const chosen =
      legacy.find((g) => String(g.id) === String(stored.selectedGoalId)) ||
      legacy[0];
    if (chosen) goal = normalizeGoal(chosen, today);
    archivedGoals.push(...legacy.filter((g) => g !== chosen));
  }
  return {
    version: 3,
    goal,
    archivedGoals,
    lang: stored.lang === "en" ? "en" : "ru",
    error: false,
  };
}

export function saveSingleGoal(data, saved) {
  // Editing the sole goal must never create another goal or discard its history.
  return {
    ...data,
    goal: data.goal
      ? {
          ...saved,
          id: data.goal.id,
          createdAt: data.goal.createdAt,
          history: data.goal.history,
        }
      : saved,
  };
}
export function demoGoal(today, lang = "ru") {
  const ru = lang === "ru";
  const createdAt = shiftDay(today, -23);
  const labels = ru
    ? [
        "Двигаться каждый день",
        "Читать и узнавать новое",
        "Пить достаточно воды",
        "Время для себя",
        "Ложиться до 23:00",
      ]
    : [
        "Move every day",
        "Read and discover",
        "Drink enough water",
        "Make time for myself",
        "Go to bed before 11 pm",
      ];
  const notes = ru
    ? [
        "30 минут активности",
        "20 страниц книги",
        "8 стаканов в день",
        "10 минут без спешки",
        "Для энергии завтра",
      ]
    : [
        "30 minutes of activity",
        "20 pages of a book",
        "8 glasses a day",
        "10 unhurried minutes",
        "More energy tomorrow",
      ];
  const subgoals = labels.map((label, i) => ({
    id: `demo-${i}`,
    label,
    note: notes[i],
    color: COLORS[i],
    icon: ["walk", "book", "water", "sun", "moon"][i],
    createdAt,
    archivedAt: null,
  }));
  const history = {};
  for (let i = 23; i >= 0; i--)
    history[shiftDay(today, -i)] = subgoals
      .slice(0, i === 0 ? 3 : i < 8 ? 5 : [3, 5, 2, 4, 0, 5, 4][i % 7])
      .map((s) => s.id);
  return {
    id: "demo",
    mainGoal: ru ? "Стать лучшей версией себя" : "Become my best self",
    description: ru
      ? "Больше энергии, осознанности и заботы о себе. Каждый день."
      : "More energy, intention, and self-care. Every single day.",
    createdAt,
    subgoals,
    history,
  };
}

import { useEffect, useId, useRef, useState } from "react";
import confetti from "canvas-confetti";
import Icon from "./icons";
import GoalOrbit from "./components/GoalOrbit";
import {
  STORAGE_KEY,
  COLORS,
  dateKey,
  fromKey,
  shiftDay,
  daysBetween,
  activeSubs,
  dayProgress,
  toggleDay,
  statistics,
  loadData,
  saveSingleGoal,
  demoGoal,
} from "./tracker";

function Dialog({ title, close, children, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`dialog ${wide ? "wide" : ""}`}
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close();
        }
      }}
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">CIRCLE UP / YOUR NEXT STEP</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Закрыть / Close"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function GoalForm({ goal, today, onSave, onClose, onDelete, t }) {
  const [name, setName] = useState(goal?.mainGoal || "");
  const [description, setDescription] = useState(goal?.description || "");
  const [subs, setSubs] = useState(() =>
    goal
      ? activeSubs(goal, today)
      : [0, 1, 2].map((i) => ({
          id: crypto.randomUUID(),
          label: "",
          note: "",
          color: COLORS[i],
          icon: ["walk", "book", "leaf"][i],
          createdAt: today,
        })),
  );
  const [error, setError] = useState("");
  const update = (id, field, value) =>
    setSubs((items) =>
      items.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );

  // Стиль для счетчика символов
  const counterStyle = (len, max) => ({
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "10px",
    color: len >= max - 5 ? "#d9534f" : "#9CA3AF", // Краснеет, если осталось мало места
    pointerEvents: "none",
    background: "rgba(255, 255, 255, 0.8)",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: "500"
  });

  function submit(e) {
    e.preventDefault();
    const valid = subs
      .filter((s) => s.label.trim())
      .map((s) => ({ ...s, label: s.label.trim(), note: s.note.trim() }));
    if (!name.trim() || !valid.length) {
      setError(
        t(
          "Назовите цель и добавьте хотя бы одну подцель.",
          "Name your goal and add at least one daily step.",
        ),
      );
      return;
    }
    const archived = (goal?.subgoals || [])
      .filter((s) => !valid.some((v) => v.id === s.id))
      .map((s) => ({ ...s, archivedAt: s.archivedAt || today }));
    onSave({
      id: goal?.id || crypto.randomUUID(),
      mainGoal: name.trim(),
      description: description.trim(),
      createdAt: goal?.createdAt || today,
      history: goal?.history || {},
      subgoals: [...valid, ...archived],
    });
  }
  return (
    <Dialog
      title={
        goal
          ? t("Настроить свою цель", "Shape your goal")
          : t("С чего начнём?", "Where shall we begin?")
      }
      close={onClose}
      wide
    >
      <form onSubmit={submit} className="goal-form">
        <label>
          {t("Моя главная цель", "My main goal")}
          {/* Обертка для счетчика */}
          <div style={{ position: "relative" }}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40} /* <--- ОГРАНИЧЕНИЕ ГЛАВНОЙ ЦЕЛИ */
              placeholder={t(
                "Например, чувствовать себя энергичнее",
                "For example, feel more energetic",
              )}
              required
              style={{ width: "100%", paddingRight: "50px" }} /* Место под счетчик */
            />
            <span style={counterStyle(name.length, 40)}>
              {name.length}/40
            </span>
          </div>
        </label>
        <label>
          {t("Почему это важно для меня", "Why this matters to me")}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={240}
            rows={2}
            placeholder={t(
              "Пара слов, которые будут вдохновлять",
              "A few words to keep you inspired",
            )}
          />
        </label>
        <div className="form-divider">
          <h3>{t("Маленькие ежедневные шаги", "Small daily steps")}</h3>
          <p>
            {t(
              "Сделайте их простыми и выполнимыми.",
              "Keep them simple and achievable.",
            )}
          </p>
        </div>
        <div className="form-subgoals">
          {subs.map((s, i) => (
            <div className="sub-form" key={s.id}>
              <label
                className="color-input"
                title={t("Цвет подцели", "Step color")}
              >
                <span style={{ background: s.color }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <input
                  type="color"
                  aria-label={`${t("Цвет подцели", "Step color")} ${i + 1}`}
                  value={s.color}
                  onChange={(e) => update(s.id, "color", e.target.value)}
                />
              </label>
              <div>
                {/* Обертка для названия подцели */}
                <div style={{ position: "relative", marginBottom: "4px" }}>
                  <input
                    aria-label={`${t("Подцель", "Daily step")} ${i + 1}`}
                    placeholder={t("Что вы будете делать?", "What will you do?")}
                    maxLength={25} /* <--- ОГРАНИЧЕНИЕ ПОДЦЕЛИ */
                    value={s.label}
                    onChange={(e) => update(s.id, "label", e.target.value)}
                    style={{ width: "100%", paddingRight: "45px" }}
                  />
                  <span style={counterStyle(s.label.length, 25)}>
                    {s.label.length}/25
                  </span>
                </div>
                
                {/* Обертка для заметки подцели */}
                <div style={{ position: "relative" }}>
                  <input
                    className="note-input"
                    aria-label={`${t("Подробности", "Details")} ${i + 1}`}
                    placeholder={t(
                      "Например, 20 минут каждый день",
                      "For example, 20 minutes every day",
                    )}
                    maxLength={45} /* <--- ОГРАНИЧЕНИЕ ЗАМЕТКИ */
                    value={s.note}
                    onChange={(e) => update(s.id, "note", e.target.value)}
                    style={{ width: "100%", paddingRight: "45px" }}
                  />
                  <span style={counterStyle(s.note.length, 45)}>
                    {s.note.length}/45
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={`${t("Убрать подцель", "Remove step")} ${i + 1}`}
                disabled={subs.length === 1}
                onClick={() =>
                  setSubs((items) => items.filter((x) => x.id !== s.id))
                }
              >
                <Icon name="close" size={17} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            setSubs((items) => [
              ...items,
              {
                id: crypto.randomUUID(),
                label: "",
                note: "",
                color: COLORS[items.length % COLORS.length],
                icon: ["walk", "book", "water", "sun", "moon"][
                  items.length % 5
                ],
                createdAt: today,
              },
            ])
          }
        >
          <Icon name="plus" size={17} />
          {t("Добавить подцель", "Add a daily step")}
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {goal && (
          <button className="delete-goal" type="button" onClick={onDelete}>
            {t("Удалить цель", "Delete goal")}
          </button>
        )}
        <div className="form-actions">
          <span>
            <Icon name="leaf" size={16} />
            {t("Ваш темп. Ваш путь.", "Your pace. Your journey.")}
          </span>
          <button className="primary" type="submit">
            {t("Сохранить цель", "Save goal")}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function App() {
  const [today, setToday] = useState(() => dateKey());
  const [data, setData] = useState(() => loadData(dateKey()));
  const [demo, setDemo] = useState(() => demoGoal(dateKey(), data.lang));
  const [view, setView] = useState("overview");
  const [selectedDay, setSelectedDay] = useState(today);
  const [modal, setModal] = useState(null);
  const [period, setPeriod] = useState(30);
  const [storageError, setStorageError] = useState(data.error);
  const [toast, setToast] = useState("");
  const t = (ru, en) => (data.lang === "ru" ? ru : en);
  const locale = data.lang === "ru" ? "ru-RU" : "en-GB";
  const format = (day, options) =>
    fromKey(day).toLocaleDateString(locale, options);
  const isDemo = !data.goal;
  const goal = data.goal || demo;
  const progress = dayProgress(goal, selectedDay);
  const stats = statistics(goal, today, period);
  const nav = [
    ["overview", "target", t("Моя цель", "My goal")],
    ["statistics", "chart", t("Статистика", "Statistics")],
    ["calendar", "calendar", t("Календарь", "Calendar")],
  ];

  useEffect(() => {
    if (data.error) return;
    // Storage can fail independently of React state (quota or browser permissions).
    /* oxlint-disable react/set-state-in-effect */
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    /* oxlint-enable react/set-state-in-effect */
  }, [data]);
  useEffect(() => {
    document.documentElement.lang = data.lang;
  }, [data.lang]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  useEffect(() => {
    const updateDate = () => {
      const next = dateKey();
      if (today !== next) {
        setToday(next);
        setSelectedDay(next);
      }
    };
    const interval = setInterval(updateDate, 30000);
    window.addEventListener("focus", updateDate);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", updateDate);
    };
  }, [today]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  function toggle(id) {
    if (selectedDay > today) return;
    const updated = toggleDay(goal, selectedDay, id);
    if (isDemo) setDemo(updated);
    else
      setData((d) => ({
        ...d,
        goal: updated,
      }));
    if (
      dayProgress(updated, selectedDay).percent === 100 &&
      progress.percent !== 100
    ) {
      confetti({
        particleCount: 70,
        spread: 75,
        origin: { x: 0.6, y: 0.65 },
        colors: COLORS,
        disableForReducedMotion: true,
      });
      setToast(
        t(
          "Все шаги сделаны. Прекрасный день!",
          "All steps done. What a lovely day!",
        ),
      );
    }
  }
  function saveGoal(saved) {
    setData((d) => saveSingleGoal(d, saved));
    setSelectedDay(today);
    setModal(null);
    setView("overview");
    setToast(
      t(
        "Ваша цель сохранена. Первый шаг уже сделан!",
        "Goal saved. Your first step is already taken!",
      ),
    );
  }
  function selectDate(day) {
    setSelectedDay(day);
    setView("overview");
  }
  function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          { ...data, exportedAt: new Date().toISOString() },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `circle-up-${today}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const weeklyChart = (
    <section className="card weekly-card">
      <div className="card-heading">
        <h2>{t("Ваш ритм", "Your rhythm")}</h2>
        <span className="muted tiny">{t("7 дней", "7 days")}</span>
      </div>
      <div className="chart-summary">
        <strong>
          {statistics(goal, today, 7).consistency}
          <small>%</small>
        </strong>
        <span>
          {t("выполненных подцелей", "of daily steps completed")}
          <br />
          <em>{t("Каждый шаг имеет значение", "Every little step counts")}</em>
        </span>
      </div>
      <div className="bar-chart">
        {Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6)).map(
          (day) => {
            const p = dayProgress(goal, day);
            return (
              <button
                key={day}
                className={`bar-column ${day === today ? "current" : ""}`}
                disabled={day < goal.createdAt}
                onClick={() => selectDate(day)}
                title={`${format(day, { day: "numeric", month: "short" })}: ${p.done}/${p.total}`}
              >
                <span className="bar-rail">
                  <span
                    className="bar-fill"
                    style={{ height: `${p.percent}%` }}
                  >
                    <span>{p.percent}%</span>
                  </span>
                </span>
                <small>{format(day, { weekday: "short" })}</small>
              </button>
            );
          },
        )}
      </div>
      <div className="chart-footer">
        <span>
          <i />
          {t("Выполнено", "Completed")}
        </span>
        <button className="text-button" onClick={() => setView("statistics")}>
          {t("Вся статистика", "All statistics")}
          <Icon name="arrow" size={16} />
        </button>
      </div>
    </section>
  );

  const heatmap = (
    <section className="card heatmap-card">
      <div className="card-heading">
        <div>
          <h2>
            {t("Маленькие шаги, большой путь", "Small steps, a big journey")}
          </h2>
          <p className="muted">
            {t(
              "Ваша активность за последние 12 недель",
              "Your activity over the last 12 weeks",
            )}
          </p>
        </div>
        <span className="soft-tag">
          {t("Всё складывается", "It all adds up")}
          <Icon name="leaf" size={15} />
        </span>
      </div>
      <div className="heatmap-body">
        <div className="heatmap-days">
          <span>{t("ПН", "MO")}</span>
          <span>{t("СР", "WE")}</span>
          <span>{t("ПТ", "FR")}</span>
          <span>{t("ВС", "SU")}</span>
        </div>
        <div className="heatmap-grid">
          {Array.from({ length: 84 }, (_, i) => {
            const start = shiftDay(
              today,
              -((fromKey(today).getDay() + 6) % 7) - 77,
            );
            const day = shiftDay(start, i);
            const p = dayProgress(goal, day);
            return (
              <button
                key={day}
                disabled={day > today || day < goal.createdAt}
                aria-label={`${format(day, { day: "numeric", month: "long" })}: ${p.percent}%`}
                title={`${format(day, { day: "numeric", month: "short" })} · ${p.done}/${p.total}`}
                className={`heat-cell level-${p.percent ? Math.ceil(p.percent / 25) : 0} ${day === today ? "heat-today" : ""}`}
                onClick={() => selectDate(day)}
              />
            );
          })}
        </div>
      </div>
      <div className="heatmap-footer">
        <span>
          {t("Привычки растут вместе с вами.", "Your habits grow with you.")}
        </span>
        <div>
          {t("Меньше", "Less")}
          {[0, 1, 2, 3, 4].map((n) => (
            <i className={`level-${n}`} key={n} />
          ))}
          {t("Больше", "More")}
        </div>
      </div>
    </section>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("overview");
          }}
        >
          <span className="brand-icon">
            <i />
            <i />
            <i />
          </span>
          circle up<span className="brand-dot">.</span>
        </a>
        <div className="nav-caption">
          {t("ВАШЕ ПРОСТРАНСТВО", "YOUR SPACE")}
        </div>
        <nav aria-label={t("Главное меню", "Main menu")}>
          {nav.map(([key, icon, title]) => (
            <button
              key={key}
              className={`nav-item ${view === key ? "active" : ""}`}
              onClick={() => setView(key)}
              aria-current={view === key ? "page" : undefined}
            >
              <Icon name={icon} />
              <span>{title}</span>
              {view === key && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="little-sun">
              <Icon name="sun" size={34} />
            </span>
            <h3>{t("В своём ритме.", "At your own pace.")}</h3>
            <p>
              {t(
                "Не нужно быть идеальным. Достаточно продолжать.",
                "You don’t have to be perfect. Just keep going.",
              )}
            </p>
            <span className="note-line" />
          </div>
          <button
            className="nav-item settings-nav"
            onClick={() => setModal("settings")}
          >
            <Icon name="settings" />
            <span>{t("Настройки", "Settings")}</span>
          </button>
          <div className="sidebar-foot">
            MADE FOR YOUR EVERYDAY <Icon name="leaf" size={12} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="breadcrumb">
              {t("Моё пространство", "My space")}
            </span>
            <span className="crumb-slash">/</span>
            <span>{nav.find((n) => n[0] === view)?.[2]}</span>
          </div>
          <div className="topbar-right">
            {isDemo && (
              <span className="demo-tag">{t("Демо-режим", "Demo mode")}</span>
            )}
            <span className="top-date">
              <Icon name="calendar" size={16} />
              {format(today, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              className="avatar"
              onClick={() => setModal("settings")}
              aria-label={t("Настройки профиля", "Profile settings")}
            >
              <Icon name="leaf" size={20} />
            </button>
          </div>
        </header>
        <main className={view === "overview" ? "orbit-page" : undefined}>
          {storageError && (
            <div role="alert" className="storage-warning">
              {t(
                "Не удалось прочитать или сохранить данные браузера. Скачайте копию в настройках; изменения пока остаются только на этом экране.",
                "Browser data could not be read or saved. Export a copy in Settings; changes are only available on this screen.",
              )}
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow greeting">
                <span />
                {t("ОДНА ЦЕЛЬ · КАЖДЫЙ ДЕНЬ", "ONE GOAL · EVERY DAY")}
              </div>
              <h1>
                {view === "overview"
                  ? t(
                      "Каждый круг — шаг ближе.",
                      "Every circle, one step closer.",
                    )
                  : view === "statistics"
                    ? t("Ваш прогресс в деталях.", "Your progress, in detail.")
                    : t(
                        "У каждого дня своя история.",
                        "Every day has a story.",
                      )}
              </h1>
              <p>
                {view === "overview"
                  ? t(
                      "Одна большая цель. Несколько маленьких действий.",
                      "One big goal. A few small daily actions.",
                    )
                  : t(
                      "Ваш путь складывается из ежедневных шагов.",
                      "Your journey is made of daily steps.",
                    )}
              </p>
            </div>
            <button
              className="primary"
              onClick={() => setModal(isDemo ? "create" : "edit")}
            >
              <Icon name={isDemo ? "plus" : "edit"} size={17} />
              {isDemo
                ? t("Создать свою цель", "Create my goal")
                : t("Изменить цель", "Edit goal")}
            </button>
          </div>
          {view === "overview" && (
            <>
              <section className="orbit-board">
                <div className="orbit-board-top">
                  <span className="orbit-board-label">
                    <i />
                    {t("ВАШ КРУГ НА ДЕНЬ", "YOUR DAILY CIRCLE")}
                  </span>
                  <div className="orbit-date-control">
                    <button
                      className="icon-button previous"
                      disabled={selectedDay <= goal.createdAt}
                      onClick={() => setSelectedDay((day) => shiftDay(day, -1))}
                      aria-label={t("Предыдущий день", "Previous day")}
                    >
                      <Icon name="chevron" size={16} />
                    </button>
                    <strong>
                      {selectedDay === today
                        ? t("Сегодня", "Today")
                        : format(selectedDay, { weekday: "short" })}
                      ,{" "}
                      {format(selectedDay, { day: "numeric", month: "short" })}
                    </strong>
                    <button
                      className="icon-button"
                      disabled={selectedDay >= today}
                      onClick={() => setSelectedDay((day) => shiftDay(day, 1))}
                      aria-label={t("Следующий день", "Next day")}
                    >
                      <Icon name="chevron" size={16} />
                    </button>
                    {selectedDay !== today && (
                      <button
                        className="text-button today-link"
                        onClick={() => setSelectedDay(today)}
                      >
                        {t("Сегодня", "Today")}
                      </button>
                    )}
                  </div>
                </div>
                <GoalOrbit
                  goal={goal}
                  day={selectedDay}
                  today={today}
                  onToggle={toggle}
                  t={t}
                />
              </section>
              <div className="orbit-summary">
                <div>
                  <Icon name="flame" size={20} />
                  <p>
                    <strong>{stats.streak}</strong>
                    <span>{t("дней подряд", "day streak")}</span>
                  </p>
                </div>
                <div>
                  <Icon name="leaf" size={18} />
                  <p>
                    <span>{t("День", "Day")}</span>
                    <strong>
                      {Math.max(1, daysBetween(goal.createdAt, today) + 1)}
                    </strong>
                    <span>{t("вашего пути", "of your journey")}</span>
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setView("statistics")}
                >
                  {t("Моя статистика", "My statistics")}
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </>
          )}
          {view === "statistics" && (
            <div className="statistics-view">
              <div className="section-toolbar">
                <span>{goal.mainGoal}</span>
                <div className="segmented">
                  {[7, 30, 90].map((n) => (
                    <button
                      className={period === n ? "selected" : ""}
                      key={n}
                      onClick={() => setPeriod(n)}
                    >
                      {n} {t("дней", "days")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="stat-tiles">
                {[
                  [
                    stats.done,
                    t("Выполненных шагов", "Completed steps"),
                    "check",
                  ],
                  [
                    `${stats.consistency}%`,
                    t("Регулярность", "Consistency"),
                    "chart",
                  ],
                  [stats.perfect, t("Идеальных дней", "Perfect days"), "sun"],
                  [stats.streak, t("Дней подряд", "Day streak"), "flame"],
                ].map(([value, label, icon]) => (
                  <section className="card stat-tile" key={label}>
                    <Icon name={icon} size={23} />
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </section>
                ))}
              </div>
              <div className="stats-columns">
                {weeklyChart}
                <section className="card habit-stats">
                  <div className="card-heading">
                    <h2>
                      {t("Каждая привычка в деталях", "Every habit, in detail")}
                    </h2>
                  </div>
                  {activeSubs(goal, today).map((s) => {
                    const eligible = stats.days.filter(
                      (d) =>
                        s.createdAt <= d.date &&
                        (!s.archivedAt || d.date < s.archivedAt),
                    );
                    const completed = eligible.filter((d) =>
                      (goal.history[d.date] || []).includes(s.id),
                    ).length;
                    return (
                      <div className="habit-stat" key={s.id}>
                        <div>
                          <Icon name={s.icon} size={17} />
                          <span>{s.label}</span>
                          <strong>
                            {completed}/{eligible.length}
                          </strong>
                        </div>
                        <div className="mini-track">
                          <i
                            style={{
                              width: `${eligible.length ? (completed / eligible.length) * 100 : 0}%`,
                              background: s.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </section>
              </div>
              {heatmap}
            </div>
          )}
          {view === "calendar" && (
            <Calendar
              goal={goal}
              today={today}
              t={t}
              locale={locale}
              selectDate={selectDate}
            />
          )}
          <footer className="page-footer">
            <span>
              <span className="footer-dot" />
              {isDemo
                ? t(
                    "Демонстрационные данные · начните со своей цели",
                    "Example data · start with your own goal",
                  )
                : storageError
                  ? t("Изменения не сохранены", "Changes are not saved")
                  : t(
                      "Ваш прогресс сохраняется в этом браузере",
                      "Your progress is saved in this browser",
                    )}
            </span>
            <span>
              ONE STEP AT A TIME <Icon name="leaf" size={13} />
            </span>
          </footer>
        </main>
      </div>
      {(modal === "create" || modal === "edit") && (
        <GoalForm
          goal={data.goal}
          today={today}
          onSave={saveGoal}
          onClose={() => setModal(null)}
          onDelete={() => {
            if (
              !window.confirm(
                t(
                  "Удалить эту цель и всю историю её отметок? Это действие нельзя отменить.",
                  "Delete this goal and its check-in history? This cannot be undone.",
                ),
              )
            )
              return;
            setData((d) => ({
              ...d,
              goal: null,
            }));
            setModal(null);
            setSelectedDay(today);
            setView("overview");
          }}
          t={t}
        />
      )}
      {modal === "settings" && (
        <Dialog
          title={t("Ваше пространство", "Your space")}
          close={() => setModal(null)}
        >
          <div className="settings-body">
            <label>
              {t("Язык приложения", "App language")}
              <select
                value={data.lang}
                onChange={(e) => {
                  const lang = e.target.value;
                  setData((d) => ({ ...d, lang }));
                  setDemo(demoGoal(today, lang));
                }}
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </label>
            <div className="privacy-note">
              <Icon name="leaf" size={25} />
              <h3>{t("Только для вас", "Just for you")}</h3>
              <p>
                {t(
                  "Ваша цель и отметки хранятся в этом браузере. Экспортируйте копию, чтобы сохранить свою историю отдельно.",
                  "Your goal and check-ins are stored in this browser. Export a copy to keep your history safe elsewhere.",
                )}
              </p>
            </div>
            {data.archivedGoals?.length > 0 && (
              <p className="archive-note">
                {t(
                  "Дополнительные цели из прежней версии сохранены в архиве и доступны в экспорте данных.",
                  "Additional goals from the previous version are preserved in the data export archive.",
                )}
              </p>
            )}
            <button className="secondary" onClick={exportData}>
              <Icon name="download" size={18} />
              {t("Скачать мои данные", "Export my data")}
            </button>
          </div>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Calendar({ goal, today, t, locale, selectDate }) {
  const [month, setMonth] = useState(() => `${today.slice(0, 7)}-01`);
  const first = fromKey(month);
  const leading = (first.getDay() + 6) % 7;
  const count = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  const nextMonth = (amount) => {
    const date = fromKey(month);
    date.setMonth(date.getMonth() + amount);
    setMonth(dateKey(date));
  };
  return (
    <section className="card calendar-card">
      <div className="calendar-heading">
        <div>
          <span className="eyebrow">{t("ВАША ИСТОРИЯ", "YOUR STORY")}</span>
          <h2>
            {first.toLocaleDateString(locale, {
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>
        <div>
          <button
            className="icon-button previous"
            disabled={month <= `${goal.createdAt.slice(0, 7)}-01`}
            aria-label={t("Предыдущий месяц", "Previous month")}
            onClick={() => nextMonth(-1)}
          >
            <Icon name="chevron" />
          </button>
          <button
            className="secondary"
            onClick={() => setMonth(`${today.slice(0, 7)}-01`)}
          >
            {t("Сегодня", "Today")}
          </button>
          <button
            className="icon-button"
            disabled={month >= `${today.slice(0, 7)}-01`}
            aria-label={t("Следующий месяц", "Next month")}
            onClick={() => nextMonth(1)}
          >
            <Icon name="chevron" />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {t(
          ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
          ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        ).map((d) => (
          <span className="calendar-weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day = shiftDay(month, i);
          const p = dayProgress(goal, day);
          return (
            <button
              key={day}
              disabled={day > today || day < goal.createdAt}
              className={`calendar-day ${day === today ? "today" : ""} ${p.percent === 100 ? "full" : ""}`}
              onClick={() => selectDate(day)}
              aria-label={`${day}: ${p.done}/${p.total}`}
            >
              <strong>{i + 1}</strong>
              <div
                className="calendar-ring"
                style={{ "--progress": `${p.percent}%` }}
              >
                <span>
                  {p.percent === 100 ? (
                    <Icon name="check" size={16} />
                  ) : (
                    `${p.percent}%`
                  )}
                </span>
              </div>
              <small>
                {p.done}/{p.total} {t("шагов", "steps")}
              </small>
            </button>
          );
        })}
      </div>
      <p className="calendar-hint">
        <Icon name="info" size={16} />
        {t(
          "Выберите прошедший день, чтобы посмотреть или дополнить отметки.",
          "Choose a past day to view or update your check-ins.",
        )}
      </p>
    </section>
  );
}

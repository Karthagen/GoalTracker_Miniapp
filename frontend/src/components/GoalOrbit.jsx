import Icon from "../icons";
import { activeSubs, dayProgress } from "../tracker";
import "./GoalOrbit.css";

export default function GoalOrbit({ goal, day, today, onToggle, t }) {
  const subs = activeSubs(goal, day);
  const progress = dayProgress(goal, day);
  const done = new Set(goal.history[day] || []);
  const expanded = subs.length > 6;
  const nodes = subs.map((sub, i) => {
    const angle = (i * Math.PI * 2) / subs.length - Math.PI / 2;
    return {
      ...sub,
      x: 50 + 35 * Math.cos(angle),
      y: 50 + 37 * Math.sin(angle),
      checked: done.has(sub.id),
    };
  });
  const circumference = 2 * Math.PI * 108;
  return (
    <div
      className={`orbit-experience ${progress.percent === 100 ? "day-complete" : ""}`}
    >
      {expanded && (
        <p className="orbit-scroll-hint">
          {t(
            "Прокрутите схему вбок, чтобы увидеть все подцели.",
            "Scroll sideways to see all your daily steps.",
          )}
        </p>
      )}
      <div
        className="orbit-scroll"
        role="region"
        aria-label={t(
          "Глобальная цель и ежедневные подцели",
          "Main goal and daily steps",
        )}
        tabIndex={expanded ? 0 : undefined}
      >
        <div
          className={`orbit-stage ${expanded ? "expanded" : ""} ${subs.length % 2 === 0 ? "with-bottom-node" : ""}`}
          style={
            expanded
              ? {
                  "--diagram-width": `${Math.max(680, subs.length * 72)}px`,
                  "--diagram-height": `${Math.max(560, subs.length * 47)}px`,
                }
              : undefined
          }
        >
          <svg
            className="orbit-connections"
            width="100%"
            height="100%"
            aria-hidden="true"
          >
            <ellipse
              className="orbit-guide"
              cx="50%"
              cy="50%"
              rx="35%"
              ry="37%"
            />
            {nodes.map((node) => (
              <g key={node.id} style={{ "--node-color": node.color }}>
                <line
                  className={`orbit-line ${node.checked ? "lit" : ""}`}
                  x1="50%"
                  y1="50%"
                  x2={`${node.x}%`}
                  y2={`${node.y}%`}
                />
                {node.checked && (
                  <circle
                    className="connection-dot"
                    cx={`${50 + (node.x - 50) * 0.64}%`}
                    cy={`${50 + (node.y - 50) * 0.64}%`}
                    r="3"
                  />
                )}
              </g>
            ))}
          </svg>
          <div
            className="orbit-center"
            aria-label={`${goal.mainGoal}. ${t("Прогресс дня", "Daily progress")}: ${progress.percent}%`}
          >
            <svg
              viewBox="0 0 240 240"
              className="center-ring"
              aria-hidden="true"
            >
              <circle className="center-ring-track" cx="120" cy="120" r="108" />
              <circle
                className="center-ring-progress"
                cx="120"
                cy="120"
                r="108"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress.percent / 100)}
                transform="rotate(-90 120 120)"
              />
            </svg>
            <div className="center-copy">
              <span className="center-eyebrow">
                {t("ГЛАВНАЯ ЦЕЛЬ", "MAIN GOAL")}
              </span>
              <h2 title={goal.mainGoal}>{goal.mainGoal}</h2>
              <div className="center-percentage">
                {progress.percent}
                <span>%</span>
              </div>
              <span className="center-day-label">
                {day === today
                  ? t("за сегодня", "today")
                  : t("за этот день", "this day")}
              </span>
            </div>
            {progress.percent === 100 && (
              <span className="center-complete-badge">
                <Icon name="check" size={17} />
              </span>
            )}
          </div>
          {nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              className={`orbit-satellite ${node.checked ? "completed" : ""}`}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                "--node-color": node.color,
              }}
              aria-label={node.label}
              aria-pressed={node.checked}
              title={`${node.label}${node.note ? ` · ${node.note}` : ""}`}
              onClick={() => onToggle(node.id)}
              disabled={day > today}
            >
              <span className="satellite-disc">
                <Icon name={node.icon} size={29} />
                <span className="satellite-tap-label">
                  {node.checked
                    ? t("Готово", "Done")
                    : t("Отметить", "Check in")}
                </span>
                <span className="satellite-check">
                  <Icon name={node.checked ? "check" : "plus"} size={14} />
                </span>
              </span>
              <span className="satellite-caption">
                <strong>{node.label}</strong>
                <small>{node.note}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div
        className={`orbit-message ${progress.percent === 100 ? "celebration" : ""}`}
        role="status"
      >
        <span className="orbit-message-icon">
          <Icon
            name={progress.percent === 100 ? "check" : "target"}
            size={18}
          />
        </span>
        <div>
          <strong>
            {progress.percent === 100
              ? t(
                  "Ваш круг на сегодня замкнулся!",
                  "Your circle is complete for today!",
                )
              : t(
                  "Нажмите на круг — сделайте шаг к цели",
                  "Tap a circle. Take a step toward your goal.",
                )}
          </strong>
          <p>
            {progress.percent === 100
              ? t(
                  "Все подцели выполнены. Завтра — новый круг.",
                  "All daily steps are done. A new circle starts tomorrow.",
                )
              : t(
                  "Отмечайте выполненные подцели. Повторное нажатие отменяет отметку.",
                  "Check off completed steps. Tap again to undo.",
                )}
          </p>
        </div>
        <span className="orbit-counter">
          {progress.done}
          <span> / {progress.total}</span>
        </span>
      </div>
    </div>
  );
}

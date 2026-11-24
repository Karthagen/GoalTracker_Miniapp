import { useState } from "react";
import Icon from "../icons";
import { COLORS } from "../tracker";

const colors = [
  [COLORS[0], "Абрикос", "Apricot"],
  [COLORS[1], "Шалфей", "Sage"],
  [COLORS[2], "Лаванда", "Lavender"],
  [COLORS[3], "Лагуна", "Lagoon"],
  [COLORS[4], "Мёд", "Honey"],
  [COLORS[5], "Роза", "Rose"],
  ["#44867c", "Эвкалипт", "Eucalyptus"],
  ["#567798", "Джинс", "Denim"],
  ["#aa6956", "Терракота", "Terracotta"],
  ["#975978", "Слива", "Plum"],
];

export default function StepColorPicker({ color, onChange, t }) {
  const [draft, setDraft] = useState(color);
  const active = colors.find(([hex]) => hex === color.toLowerCase());
  function choose(hex) {
    setDraft(hex);
    onChange(hex);
  }
  return (
    <details className="step-colors">
      <summary>
        <span>{t("Цвет круга", "Circle color")}</span>
        <span className="current-color"><i style={{ backgroundColor: color }} />
          {active ? t(active[1], active[2]) : t("Свой цвет", "Custom color")}
        </span>
        <Icon name="chevron" size={15} />
      </summary>
      <div className="step-swatches" role="group" aria-label={t("Палитра", "Palette")}>
        {colors.map(([hex, ru, en]) => (
          <button key={hex} type="button" aria-label={t(ru, en)} title={t(ru, en)}
            aria-pressed={active?.[0] === hex} onClick={() => choose(hex)}>
            <span style={{ backgroundColor: hex }}>
              {active?.[0] === hex && <Icon name="check" size={15} />}
            </span>
          </button>
        ))}
      </div>
      <label className="custom-step-color">
        {t("Свой цвет (HEX)", "Custom color (HEX)")}
        <input value={draft} maxLength={7} spellCheck={false} autoCapitalize="none"
          pattern="#?[0-9a-fA-F]{6}" required placeholder="#879b71"
          title={t("6 цифр или букв A–F, например #879b71", "6 hexadecimal digits, e.g. #879b71")}
          onChange={e => {
            const value = e.target.value;
            setDraft(value);
            if (/^#?[0-9a-f]{6}$/i.test(value)) onChange("#" + value.replace("#", "").toLowerCase());
          }}
          onBlur={() => setDraft(color)}
        />
      </label>
    </details>
  );
}

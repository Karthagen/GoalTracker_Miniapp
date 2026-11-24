import { useEffect, useRef, useState } from "react";
import { getTelegramInitData } from "../sync";

const endpoint = "/goaltracker/api/support";

export default function SupportForm({ t }) {
  const auth = getTelegramInitData();
  const [kind, setKind] = useState("bug");
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState(null);
  const [status, setStatus] = useState("");
  const [ticket, setTicket] = useState(null);
  const attempt = useRef(null);
  const lastQuota = useRef(0);
  useEffect(() => {
    if (!auth) return;
    const controller = new AbortController();
    const version = lastQuota.current;
    fetch(endpoint, { headers: { "X-Telegram-Init-Data": auth }, cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          if (version === lastQuota.current && !controller.signal.aborted) setRemaining(data.remaining);
        }
      }).catch(() => {});
    return () => controller.abort();
  }, [auth]);

  async function submit(e) {
    e.preventDefault();
    if (status === "sending" || !auth || !message.trim()) return;
    setStatus("sending");
    lastQuota.current++;
    try {
      const body = { kind, message: message.trim() };
      if (attempt.current?.kind !== kind || attempt.current.message !== body.message)
        attempt.current = { ...body, requestId: crypto.randomUUID() };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": auth },
        body: JSON.stringify(attempt.current),
      });
      if (res.status === 429) { setRemaining(0); setStatus("limit"); return; }
      if (res.status === 401) { setStatus("auth"); return; }
      if (!res.ok) throw new Error();
      const receipt = await res.json();
      if (!Number.isInteger(receipt.ticket)) throw new Error();
      setTicket(receipt.ticket);
      setRemaining(receipt.remaining);
      setMessage("");
      attempt.current = null;
      setStatus("sent");
    } catch { setStatus("error"); }
  }

  const busy = status === "sending";
  return <form className="support-form" onSubmit={submit}>
    <h3>{t("Связь с разработчиками", "Contact the developers")}</h3>
    <p>{remaining == null ? t("До 5 обращений в месяц.", "Up to 5 messages per month.") :
      t(`Осталось в этом месяце: ${remaining} из 5.`, `Messages left this month: ${remaining} of 5.`)}</p>
    {auth ? <>
      <label>{t("Тема", "Topic")}
        <select value={kind} disabled={busy} onChange={e => { setKind(e.target.value); setStatus(""); }}>
          <option value="bug">{t("Сообщить об ошибке", "Report a bug")}</option>
          <option value="contact">{t("Написать разработчикам", "Message the developers")}</option>
        </select>
      </label>
      <label>{t("Сообщение", "Message")}
        <textarea rows={3} maxLength={2000} required value={message} disabled={busy}
          placeholder={kind === "bug" ? t("Что произошло и после какого действия?", "What happened and what did you tap?") : t("Что вы хотите нам написать?", "What would you like to tell us?")}
          onChange={e => { setMessage(e.target.value); setStatus(""); }} />
      </label>
      <button className="primary" disabled={busy || remaining === 0 || !message.trim()}>
        {busy ? t("Отправляем…", "Sending…") : t("Отправить", "Send")}
      </button>
      <div role="status">
        {status === "sent" && t(`Ваша жалоба принята и будет рассмотрена. №${ticket}`, `Your message has been received and will be reviewed. #${ticket}`)}
        {status === "error" && t("Не удалось подтвердить отправку. Попробуйте ещё раз.", "Could not confirm delivery. Please retry.")}
        {status === "auth" && t("Откройте трекер заново в Telegram.", "Reopen the tracker in Telegram.")}
        {remaining === 0 && <p>{t("Лимит исчерпан до начала следующего месяца (UTC).", "You can send again next month (UTC).")}</p>}
      </div>
    </> : <p>{t("Чтобы отправить обращение, откройте трекер через Telegram-бота.", "To send a message, open the tracker through the Telegram bot.")}</p>}
  </form>;
}

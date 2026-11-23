const API_BASE = "/goaltracker/api";

export function getTelegramInitData(scope = globalThis) {
  return scope?.Telegram?.WebApp?.initData || "";
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 409) {
    throw new Error(payload.message || `Sync failed (${response.status})`);
  }
  return payload;
}

export async function loadRemoteState(initData, fetchImpl = fetch) {
  const response = await fetchImpl(`${API_BASE}/state`, {
    headers: { "X-Telegram-Init-Data": initData },
    cache: "no-store",
  });
  return parseResponse(response);
}

export async function saveRemoteState(initData, state, fetchImpl = fetch) {
  const response = await fetchImpl(`${API_BASE}/state`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    },
    body: JSON.stringify({ state }),
  });
  return {
    conflict: response.status === 409,
    ...(await parseResponse(response)),
  };
}

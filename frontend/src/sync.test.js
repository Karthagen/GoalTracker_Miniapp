import test from "node:test";
import assert from "node:assert/strict";
import {
  getTelegramInitData,
  loadRemoteState,
  saveRemoteState,
} from "./sync.js";

const response = (status, payload) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

test("reads Telegram Mini App init data", () => {
  assert.equal(
    getTelegramInitData({ Telegram: { WebApp: { initData: "signed" } } }),
    "signed",
  );
  assert.equal(getTelegramInitData({}), "");
});

test("loads state with Telegram authentication", async () => {
  let request;
  const result = await loadRemoteState("signed", async (url, options) => {
    request = { url, options };
    return response(200, { state: { version: 3 } });
  });
  assert.equal(request.url, "/goaltracker/api/state");
  assert.equal(request.options.headers["X-Telegram-Init-Data"], "signed");
  assert.equal(result.state.version, 3);
});

test("reports a stale-write conflict with the server copy", async () => {
  const result = await saveRemoteState(
    "signed",
    { version: 3, updatedAt: 10 },
    async () => response(409, { state: { version: 3, updatedAt: 20 } }),
  );
  assert.equal(result.conflict, true);
  assert.equal(result.state.updatedAt, 20);
});

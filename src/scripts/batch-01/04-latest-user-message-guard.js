(() => {
  "use strict";

  const INJECTION_ID = "hypno-app-revised-latest-user-guard";
  const STATE_KEY = "__HYPNO_APP_REVISED_LATEST_USER_GUARD__";
  const MAX_LENGTH = 4000;

  try {
    globalThis[STATE_KEY]?.dispose?.();
  } catch {}

  let disposed = false;
  let handle = null;
  const subscriptions = [];
  const boundEvents = new Set();

  function context() {
    try {
      return globalThis.SillyTavern?.getContext?.() || globalThis.getContext?.() || null;
    } catch {
      return null;
    }
  }

  function rawMessageText(message) {
    return message?.mes ?? message?.message ?? message?.content ?? message?.text ?? "";
  }

  function latestUserMessage() {
    const chat = context()?.chat || [];
    for (let index = chat.length - 1; index >= 0; index -= 1) {
      const message = chat[index];
      if (!message || message.is_system || message.isSystem || message.hidden || message.is_hidden) continue;
      if (message.is_user || message.isUser || message.from_user) return message;
    }
    return null;
  }

  function clear() {
    try {
      handle?.uninject?.();
    } catch {}
    handle = null;
    try {
      globalThis.uninjectPrompts?.([INJECTION_ID]);
    } catch {}
  }

  function apply() {
    clear();
    if (disposed) return false;
    const message = latestUserMessage();
    const text = rawMessageText(message);
    if (!text || text.length > MAX_LENGTH || text.includes("<本轮操作>")) return false;
    const prompt = `[最新用户消息完整性守卫]\n当前最新用户消息已保留，正文模型必须优先响应该消息。\n`;
    if (typeof globalThis.setExtensionPrompt === "function") {
      handle = globalThis.setExtensionPrompt(INJECTION_ID, prompt, 0, 0, false, 0);
    }
    return Boolean(handle);
  }

  function boot() {
    apply();
    const events = globalThis.tavern_events || {};
    [
      events.GENERATION_STARTED,
      events.MESSAGE_SENT,
      events.MESSAGE_SWIPED,
      events.MESSAGE_UPDATED,
      events.CHAT_CHANGED,
      "generation_started",
      "message_sent",
      "message_swiped",
      "message_updated",
      "chat_changed"
    ].filter(Boolean).forEach((name) => {
      if (!name || boundEvents.has(name) || typeof globalThis.eventOn !== "function") return;
      try {
        const handler = () => apply();
        const registration = globalThis.eventOn(name, handler);
        subscriptions.push({ name, handler, handle: registration });
        boundEvents.add(name);
      } catch {}
    });
  }

  function dispose() {
    disposed = true;
    clear();
    for (const item of subscriptions.splice(0)) {
      try {
        item.handle?.stop?.() || item.handle?.unsubscribe?.() || item.handle?.off?.();
        if (typeof globalThis.eventOff === "function") globalThis.eventOff(item.name, item.handler);
      } catch {}
    }
  }

  globalThis[STATE_KEY] = { dispose };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

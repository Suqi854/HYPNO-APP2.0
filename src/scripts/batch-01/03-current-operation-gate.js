(() => {
  "use strict";

  const INJECTION_ID = "hypno-app-revised-current-operation-gate";
  const STATE_KEY = "__HYPNO_APP_REVISED_CURRENT_OPERATION_GATE__";
  const PREFIX = "[本轮操作执行闸门]\n下方容器是当前最新用户消息中的本轮操作。它是本次回复唯一必须先完成的行动队列。\n\n";

  try {
    globalThis[STATE_KEY]?.dispose?.();
  } catch {}

  let disposed = false;
  let injectionHandle = null;
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

  function latestVisibleUserMessage() {
    const chat = context()?.chat || [];
    for (let index = chat.length - 1; index >= 0; index -= 1) {
      const message = chat[index];
      if (!message || message.is_system || message.isSystem || message.hidden || message.is_hidden) continue;
      if (message.is_user || message.isUser || message.from_user) return message;
    }
    return null;
  }

  function extractOperationBlock(text) {
    const match = String(text || "").match(/<本轮操作>([\s\S]*?)<\/本轮操作>/);
    return match?.[1]?.trim() || "";
  }

  function clearPrompt() {
    try {
      injectionHandle?.uninject?.();
    } catch {}
    injectionHandle = null;
    try {
      globalThis.uninjectPrompts?.([INJECTION_ID]);
    } catch {}
  }

  function apply() {
    clearPrompt();
    if (disposed) return false;
    const latest = latestVisibleUserMessage();
    const block = extractOperationBlock(rawMessageText(latest));
    if (!block) return false;
    const prompt = PREFIX + `<本轮操作>\n${block}\n</本轮操作>`;
    if (typeof globalThis.setExtensionPrompt === "function") {
      injectionHandle = globalThis.setExtensionPrompt(INJECTION_ID, prompt, 0, 0, false, 0);
    }
    return Boolean(injectionHandle);
  }

  function subscribe(name) {
    if (!name || boundEvents.has(name) || typeof globalThis.eventOn !== "function") return;
    try {
      const handler = () => apply();
      const handle = globalThis.eventOn(name, handler);
      subscriptions.push({ name, handler, handle });
      boundEvents.add(name);
    } catch {}
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
    ].filter(Boolean).forEach(subscribe);
  }

  function dispose() {
    disposed = true;
    clearPrompt();
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

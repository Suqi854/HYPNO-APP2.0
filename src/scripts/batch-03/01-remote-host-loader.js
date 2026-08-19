(() => {
  "use strict";

  const CONFIG = globalThis.HypnoAppRevisedRemoteConfig;
  const STATE_KEY = "__HYPNO_APP_REVISED_FLOATING_HOST__";
  const LOADER_ATTR = "data-hypno-app-revised-host-loader";

  try {
    globalThis[STATE_KEY]?.dispose?.();
  } catch {}

  let disposed = false;
  const subscriptions = [];
  const boundEvents = new Set();

  function context() {
    try {
      return globalThis.SillyTavern?.getContext?.() || globalThis.getContext?.() || null;
    } catch {
      return null;
    }
  }

  function clearExisting() {
    const host = globalThis;
    try {
      if (host.__ST_HYPNOOS_FLOATING_SINGLETON__?.revision === CONFIG.revision) {
        host.__ST_HYPNOOS_FLOATING_SINGLETON__.start?.();
        return true;
      }
      host.__ST_HYPNOOS_FLOATING_SINGLETON__?.destroy?.();
    } catch {
      // 忽略旧实例销毁失败。
    }
    return false;
  }

  function injectLoader() {
    if (!CONFIG || !CONFIG.bootstrapUrl || !CONFIG.frontendUrl || !CONFIG.revision) return false;
    if (clearExisting()) return true;
    const documentObject = globalThis.document;
    const existing = documentObject.querySelector(`script[${LOADER_ATTR}]`);
    if (existing?.dataset?.revision === CONFIG.revision && existing.isConnected) return true;
    try {
      existing?.remove?.();
    } catch {}
    const script = documentObject.createElement("script");
    script.src = CONFIG.bootstrapUrl;
    script.async = true;
    script.dataset.hypnoAppRevisedHostLoader = "true";
    script.dataset.mode = "host";
    script.dataset.frontendUrl = CONFIG.frontendUrl;
    script.dataset.assetBase = CONFIG.assetBase;
    script.dataset.revision = CONFIG.revision;
    script.dataset.loading = "true";
    script.addEventListener("load", () => {
      if (!disposed) script.dataset.loading = "false";
    }, { once: true });
    script.addEventListener("error", () => {
      try {
        script.remove();
      } catch {}
    }, { once: true });
    (documentObject.head || documentObject.documentElement).appendChild(script);
    return true;
  }

  function subscribe(name) {
    if (!name || boundEvents.has(name) || typeof globalThis.eventOn !== "function") return;
    try {
      const handler = () => injectLoader();
      const handle = globalThis.eventOn(name, handler);
      subscriptions.push({ name, handler, handle });
      boundEvents.add(name);
    } catch {}
  }

  function boot() {
    if (!injectLoader()) return;
    const events = globalThis.tavern_events || {};
    [
      events.CHAT_CHANGED,
      events.GENERATION_STARTED,
      events.MESSAGE_RECEIVED,
      events.MESSAGE_SENT,
      "chat_changed",
      "generation_started",
      "message_received",
      "message_sent"
    ].filter(Boolean).forEach(subscribe);
  }

  function dispose() {
    disposed = true;
    for (const item of subscriptions.splice(0)) {
      try {
        item.handle?.stop?.() || item.handle?.unsubscribe?.() || item.handle?.off?.();
        if (typeof globalThis.eventOff === "function") globalThis.eventOff(item.name, item.handler);
      } catch {}
    }
    try {
      globalThis.__ST_HYPNOOS_FLOATING_SINGLETON__?.destroy?.();
    } catch {}
  }

  globalThis[STATE_KEY] = { dispose };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

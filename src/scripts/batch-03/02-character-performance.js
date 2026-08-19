(() => {
  "use strict";

  const ENABLED = false;
  if (!ENABLED) return;

  const INJECTION_ID = "hypno-app-revised-character-performance";
  const STATE_KEY = "__HYPNO_APP_REVISED_CHARACTER_PERFORMANCE__";
  const PROMPT = "[通用人物演出]\n若本轮正文需要收束多名角色，请在正文末尾输出一个通用人物演出块。块内每条只写角色原名和新的动作、台词或思考，不复述正文。\n";

  try {
    globalThis[STATE_KEY]?.dispose?.();
  } catch {}

  let disposed = false;
  let handle = null;

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
    if (disposed || typeof globalThis.setExtensionPrompt !== "function") return false;
    handle = globalThis.setExtensionPrompt(INJECTION_ID, PROMPT, 0, 0, false, 0);
    return Boolean(handle);
  }

  function dispose() {
    disposed = true;
    clear();
  }

  globalThis[STATE_KEY] = { dispose };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }
})();

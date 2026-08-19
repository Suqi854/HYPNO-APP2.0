(() => {
  "use strict";

  const script = document.currentScript;
  const config = {
    revision: script?.dataset?.revision || "local",
    frontendUrl: script?.dataset?.frontendUrl || "",
    assetBase: script?.dataset?.assetBase || ""
  };
  const host = window;

  function createHost() {
    const root = document.createElement("div");
    root.id = "hypno-app-revised-host";
    root.style.cssText = [
      "position:fixed",
      "right:18px",
      "bottom:18px",
      "z-index:2147483000",
      "font-family:'Segoe UI','Microsoft YaHei',system-ui,sans-serif"
    ].join(";");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = "催眠";
    toggle.title = "打开催眠APP（改）";
    toggle.style.cssText = [
      "width:54px",
      "height:54px",
      "border-radius:50%",
      "border:1px solid rgba(148,163,184,0.5)",
      "background:#111827",
      "color:#22d3ee",
      "box-shadow:0 10px 30px rgba(0,0,0,0.35)",
      "cursor:pointer",
      "font-weight:700",
      "font-size:13px"
    ].join(";");

    const panel = document.createElement("section");
    panel.setAttribute("aria-label", "催眠APP（改）");
    panel.style.cssText = [
      "position:fixed",
      "right:18px",
      "bottom:84px",
      "width:min(420px,calc(100vw - 32px))",
      "height:min(720px,calc(100dvh - 120px))",
      "display:none",
      "overflow:hidden",
      "border:1px solid rgba(148,163,184,0.4)",
      "border-radius:12px",
      "background:#111827",
      "box-shadow:0 20px 60px rgba(0,0,0,0.5)"
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText = [
      "height:40px",
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "padding:0 12px",
      "border-bottom:1px solid rgba(148,163,184,0.25)",
      "background:#1f2937",
      "color:#e5e7eb",
      "font-size:13px"
    ].join(";");

    const title = document.createElement("span");
    title.textContent = "催眠APP（改）";

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "关闭";
    close.style.cssText = "border:0;background:transparent;color:#9ca3af;cursor:pointer;font:inherit";

    const frame = document.createElement("iframe");
    frame.id = "hypno-app-revised-frame";
    frame.title = "催眠APP（改）";
    frame.src = config.frontendUrl;
    frame.setAttribute("allow", "clipboard-read; clipboard-write");
    frame.style.cssText = "width:100%;height:calc(100% - 40px);border:0;display:block;background:#111827";

    header.appendChild(title);
    header.appendChild(close);
    panel.appendChild(header);
    panel.appendChild(frame);
    root.appendChild(toggle);
    document.body.appendChild(panel);

    const setOpen = (open) => {
      panel.style.display = open ? "block" : "none";
      toggle.textContent = open ? "关闭" : "催眠";
      toggle.setAttribute("aria-expanded", String(open));
    };

    toggle.addEventListener("click", () => setOpen(panel.style.display !== "block"));
    close.addEventListener("click", () => setOpen(false));

    return {
      root,
      panel,
      frame,
      setOpen,
      destroy() {
        root.remove();
        panel.remove();
      }
    };
  }

  const existing = host.__ST_HYPNOOS_FLOATING_SINGLETON__;
  if (existing?.revision === config.revision) {
    existing.start?.();
  } else {
    try {
      existing?.destroy?.();
    } catch {}
    let instance = null;
    host.__ST_HYPNOOS_FLOATING_SINGLETON__ = {
      revision: config.revision,
      start() {
        if (!instance) instance = createHost();
        return instance;
      },
      destroy() {
        try {
          instance?.destroy();
        } catch {}
        instance = null;
      }
    };
    host.__ST_HYPNOOS_FLOATING_SINGLETON__.start();
  }
})();

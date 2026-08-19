(() => {
  "use strict";

  const core = globalThis.HypnoAppRevisedCore;
  if (!core) return;

  function parseJsonText(text) {
    if (!text) return null;
    const trimmed = String(text).trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced) {
        try {
          return JSON.parse(fenced[1].trim());
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  async function callCustomChat(messages, jsonMode = false) {
    const settings = core.getSettings();
    const endpoint = String(settings.endpoint || "").trim();
    if (!endpoint) throw new Error("请先填写 API 端点");
    const chatUrl = endpoint.includes("/chat/completions")
      ? endpoint
      : `${endpoint.replace(/\/+$/, "")}/chat/completions`;
    const body = {
      model: settings.model || "gpt-4o-mini",
      messages,
      temperature: Number(settings.temperature ?? 0.7),
      max_tokens: Number(settings.maxTokens ?? 1024)
    };
    if (jsonMode) body.response_format = { type: "json_object" };
    const response = await fetch(chatUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey || ""}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`API 请求失败：${response.status}`);
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return parseJsonText(text) || { content: text };
  }

  async function callCustomModels(endpoint, apiKey) {
    const base = String(endpoint || "").trim();
    if (!base) throw new Error("请先填写 API 端点");
    const modelsUrl = base.includes("/chat/completions")
      ? base.replace(/\/chat\/completions$/, "/models")
      : `${base.replace(/\/+$/, "")}/models`;
    const response = await fetch(modelsUrl, {
      headers: {
        Authorization: `Bearer ${apiKey || ""}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) throw new Error(`获取模型失败：${response.status}`);
    const data = await response.json();
    if (Array.isArray(data.data)) return data.data.map((item) => item.id).filter(Boolean);
    if (Array.isArray(data)) return data.map((item) => (typeof item === "string" ? item : item.id)).filter(Boolean);
    return [];
  }

  core.register("api:get", () => core.getSettings());
  core.register("api:set", (payload) => core.setSettings(payload));
  core.register("api:presets", async () => {
    try {
      const presets = await globalThis.SillyTavern?.getPresetManager?.()?.getPresets?.();
      if (Array.isArray(presets)) return presets.map((item) => item.name || item).filter(Boolean);
    } catch {
      // 无可用预设时返回空数组。
    }
    return [];
  });
  core.register("api:models", (payload) => callCustomModels(payload.endpoint, payload.apiKey));

  globalThis.HypnoAppRevisedApi = {
    callCustomChat,
    callCustomModels,
    parseJsonText
  };
})();

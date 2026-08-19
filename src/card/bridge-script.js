(() => {
  "use strict";

  const NAMESPACE = "hypno-app-revised";
  const SETTINGS_KEY = "hypno-app-revised:settings:v1";
  const STATE_KEY = "hypno-app-revised:state:v1";

  const defaultState = () => ({
    roles: [],
    locations: [],
    rules: [],
    plot: "",
    icon: "pulse",
    crack: { mc: false, money: false, vip: false }
  });

  const defaultSettings = () => ({
    mode: "custom",
    endpoint: "",
    apiKey: "",
    model: "",
    maxTokens: 1024,
    temperature: 0.7,
    preset: ""
  });

  let state = loadJson(STATE_KEY, defaultState());
  let settings = loadJson(SETTINGS_KEY, defaultSettings());

  function loadJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 私密或存储不可用时仍保持内存状态，不写入世界书。
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeState(value) {
    const next = { ...defaultState(), ...(value || {}) };
    next.crack = { mc: false, money: false, vip: false, ...(next.crack || {}) };
    next.roles = Array.isArray(next.roles) ? next.roles : [];
    next.locations = Array.isArray(next.locations) ? next.locations : [];
    next.rules = Array.isArray(next.rules) ? next.rules : [];
    return next;
  }

  function normalizeSettings(value) {
    return { ...defaultSettings(), ...(value || {}) };
  }

  async function getWorldInfo() {
    const st = window.SillyTavern || {};
    if (typeof st.loadWorldInfo === "function") {
      try {
        const world = await st.loadWorldInfo();
        if (world && Array.isArray(world.entries)) return world;
      } catch {
        // 回退到角色卡字段。
      }
    }
    if (typeof st.getCharacterCardFields === "function") {
      const fields = st.getCharacterCardFields();
      const world = fields && fields.character_book;
      if (world && Array.isArray(world.entries)) return world;
    }
    return { name: "催眠APP（改）", entries: [] };
  }

  async function saveWorldInfo(world) {
    const st = window.SillyTavern || {};
    if (typeof st.saveWorldInfo === "function") {
      await st.saveWorldInfo(world);
    } else if (typeof st.getCharacterCardFields === "function") {
      const fields = st.getCharacterCardFields();
      if (fields) fields.character_book = world;
    }
    if (typeof st.reloadWorldInfoEditor === "function") st.reloadWorldInfoEditor();
    if (typeof st.updateWorldInfoList === "function") st.updateWorldInfoList();
  }

  function makeExtensions(position = 0) {
    return {
      position,
      exclude_recursion: false,
      display_index: 0,
      probability: 100,
      useProbability: true,
      depth: 4,
      selectiveLogic: 0,
      outlet_name: "",
      group: "",
      group_override: false,
      group_weight: 100,
      prevent_recursion: false,
      delay_until_recursion: false,
      scan_depth: null,
      match_whole_words: null,
      use_group_scoring: false,
      case_sensitive: null,
      automation_id: "",
      role: 0,
      vectorized: false,
      sticky: 0,
      cooldown: 0,
      delay: 0,
      match_persona_description: false,
      match_character_description: false,
      match_character_personality: false,
      match_character_depth_prompt: false,
      match_scenario: false,
      match_creator_notes: false,
      triggers: [],
      ignore_budget: false
    };
  }

  function makeEntry(comment, content, keys = [], insertionOrder = 100, constant = false) {
    return {
      id: Date.now() + Math.floor(Math.random() * 100000),
      keys,
      secondary_keys: [],
      comment,
      content,
      constant,
      selective: false,
      insertion_order: insertionOrder,
      enabled: true,
      position: "before_char",
      use_regex: true,
      extensions: makeExtensions()
    };
  }

  function personaText(role) {
    const persona = role?.draft?.persona || {};
    return Object.entries(persona)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join("、") : value}`)
      .join("\n");
  }

  function variablesText(role) {
    return JSON.stringify(role?.draft?.variables || {}, null, 2);
  }

  function syncWorldEntries(world) {
    const entries = Array.isArray(world.entries) ? world.entries : [];
    let order = 100;

    const removeByCommentPrefix = (prefix) => {
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        if (entries[i].comment?.startsWith(prefix)) entries.splice(i, 1);
      }
    };

    removeByCommentPrefix("[角色-人设]");
    removeByCommentPrefix("[角色-变量]");
    removeByCommentPrefix("[档案]");
    removeByCommentPrefix("[地点]");
    removeByCommentPrefix("[规则]");

    for (const role of state.roles) {
      const name = String(role.name || role.draft?.persona?.姓名 || "未命名角色");
      const aliases = Array.isArray(role.draft?.persona?.别名) ? role.draft.persona.别名 : [];
      entries.push(makeEntry(`[角色-人设]${name}`, personaText(role), [name, ...aliases], (order += 1)));
      entries.push(makeEntry(`[角色-变量]${name}`, variablesText(role), [name, `${name}变量`], (order += 1)));
      entries.push(
        makeEntry(
          `[档案]${name}`,
          `<角色档案>\n${personaText(role)}\n\n变量:\n${variablesText(role)}\n</角色档案>`,
          [name],
          (order += 1)
        )
      );
    }

    for (const location of state.locations) {
      const name = String(location.name || "未命名地点");
      entries.push(
        makeEntry(
          `[地点]${name}`,
          `<地点>\n名称: ${name}\n描述: ${location.description || "暂无描述"}\n</地点>`,
          [name],
          (order += 1)
        )
      );
    }

    for (const rule of state.rules) {
      entries.push(
        makeEntry(
          `[规则]${rule.id}`,
          `<规则>\n类型: ${rule.type || "永久"}\n范围: ${rule.scope || "整个故事"}\n时间: ${rule.time || "永久"}\n内容: ${rule.text || ""}\n</规则>`,
          [],
          (order += 1)
        )
      );
    }

    if (state.plot) {
      entries.push(makeEntry("剧情大纲", `<剧情大纲>\n${state.plot}\n</剧情大纲>`, [], (order += 1), true));
    }

    const names = state.roles.map((role) => String(role.name || role.draft?.persona?.姓名 || "未命名角色"));
    const listIndex = entries.findIndex((entry) => entry.comment === "人物列表");
    const listContent = `人物列表:\n${names.length ? names.map((name) => `- ${name}`).join("\n") : "- 暂无角色"}`;
    if (listIndex >= 0) entries[listIndex].content = listContent;
    else entries.push(makeEntry("人物列表", listContent, [], (order += 1), true));

    const archiveIndex = entries.findIndex((entry) => entry.comment === "APP档案");
    const archiveContent = `APP档案:\n${names.length ? names.map((name) => `- ${name}`).join("\n") : "- 暂无角色"}`;
    if (archiveIndex >= 0) entries[archiveIndex].content = archiveContent;
    else entries.push(makeEntry("APP档案", archiveContent, [], (order += 1), true));

    world.entries = entries;
    world.name = "催眠APP（改）";
    return world;
  }

  async function syncWorldbook() {
    const world = await getWorldInfo();
    syncWorldEntries(world);
    await saveWorldInfo(world);
  }

  async function syncMvu() {
    const mvu = window.Mvu;
    if (!mvu) return;
    let data = mvu.getMvuData ? mvu.getMvuData() : null;
    if (!data || typeof data !== "object") data = {};
    if (!data.stat_data || typeof data.stat_data !== "object") data.stat_data = {};
    const roleData = {};
    for (const role of state.roles) {
      const name = String(role.name || role.draft?.persona?.姓名 || "未命名角色");
      roleData[name] = role.draft?.variables || {};
    }
    data.stat_data.角色 = roleData;
    if (typeof mvu.replaceMvuData === "function") await mvu.replaceMvuData(data);
  }

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

  async function generateRole(text) {
    const messages = [
      {
        role: "system",
        content:
          "你是角色卡生成器。请只输出一个合法 JSON 对象，不要 Markdown。对象包含 persona 和 variables 两部分。persona 至少包含姓名、性别、年龄、身份、外貌、性格、背景、NSFW 和关系；variables 包含状态、敏感、物品等可变字段。"
      },
      { role: "user", content: String(text || "") }
    ];
    let result;
    if (settings.mode === "tavern") {
      if (typeof window.generate === "function") {
        const textResult = await window.generate({ prompt: messages.map((m) => m.content).join("\n"), json_mode: true });
        result = parseJsonText(textResult) || { content: textResult };
      } else if (typeof window.SillyTavern?.generateQuietPrompt === "function") {
        const textResult = await window.SillyTavern.generateQuietPrompt(messages);
        result = parseJsonText(textResult) || { content: textResult };
      } else {
        throw new Error("当前酒馆环境没有可用的生成桥");
      }
    } else {
      result = await callCustomChat(messages, true);
    }
    if (result.persona || result.variables) return result;
    if (result.content) return { persona: { 姓名: "未命名角色", 背景: result.content }, variables: {} };
    return result;
  }

  async function handle(action, payload = {}) {
    if (action === "state:get") return clone(normalizeState(state));
    if (action === "api:get") return clone(normalizeSettings(settings));
    if (action === "api:set") {
      settings = normalizeSettings(payload);
      saveJson(SETTINGS_KEY, settings);
      return clone(settings);
    }
    if (action === "api:presets") {
      const st = window.SillyTavern || {};
      try {
        const presets = await st.getPresetManager?.()?.getPresets?.();
        if (Array.isArray(presets)) return presets.map((item) => item.name || item).filter(Boolean);
      } catch {
        // 无可用预设时返回空数组。
      }
      return [];
    }
    if (action === "api:models") return callCustomModels(payload.endpoint, payload.apiKey);
    if (action === "role:generate") return generateRole(payload.text || "");
    if (action === "role:confirm") {
      const draft = payload.draft;
      const name = String(draft?.persona?.姓名 || draft?.persona?.name || "未命名角色");
      state.roles = state.roles.filter((item) => item.name !== name);
      state.roles.push({ name, draft });
      saveJson(STATE_KEY, state);
      await syncWorldbook();
      await syncMvu();
      return clone(normalizeState(state));
    }
    if (action === "role:delete") {
      state.roles = state.roles.filter((item) => item.name !== payload.name);
      saveJson(STATE_KEY, state);
      await syncWorldbook();
      await syncMvu();
      return clone(normalizeState(state));
    }
    if (action === "location:add") {
      state.locations = state.locations.filter((item) => item.name !== payload.name);
      state.locations.push({ name: payload.name, description: payload.description || "" });
      saveJson(STATE_KEY, state);
      await syncWorldbook();
      return clone(normalizeState(state));
    }
    if (action === "location:delete") {
      state.locations = state.locations.filter((item) => item.name !== payload.name);
      saveJson(STATE_KEY, state);
      await syncWorldbook();
      return clone(normalizeState(state));
    }
    if (action === "rule:save") {
      state.rules = state.rules.filter((item) => item.id !== payload.id);
      state.rules.push({
        id: payload.id,
        text: payload.text || "",
        type: payload.type || "永久",
        scope: payload.scope || "整个故事",
        time: payload.time || "永久"
      });
      saveJson(STATE_KEY, state);
      await syncWorldbook();
      return clone(normalizeState(state));
    }
    if (action === "rule:delete") {
      state.rules = state.rules.filter((item) => item.id !== payload.id);
      saveJson(STATE_KEY, state);
      await syncWorldbook();
      return clone(normalizeState(state));
    }
    if (action === "plot:save") {
      state.plot = payload.plot || "";
      saveJson(STATE_KEY, state);
      await syncWorldbook();
      return clone(normalizeState(state));
    }
    if (action === "icon:set") {
      state.icon = payload.icon || "pulse";
      saveJson(STATE_KEY, state);
      return clone(normalizeState(state));
    }
    if (action === "crack:set") {
      state.crack = { mc: false, money: false, vip: false, ...(payload || {}) };
      saveJson(STATE_KEY, state);
      return clone(normalizeState(state));
    }
    throw new Error(`未知操作：${action}`);
  }

  window.addEventListener("message", async (event) => {
    const data = event.data;
    if (!data || data.namespace !== NAMESPACE || data.type !== "request" || !data.id) return;
    try {
      const result = await handle(data.action, data.payload || {});
      event.source?.postMessage?.({ namespace: NAMESPACE, type: "response", id: data.id, ok: true, result }, "*");
    } catch (error) {
      event.source?.postMessage?.({ namespace: NAMESPACE, type: "response", id: data.id, ok: false, error: error.message || "操作失败" }, "*");
    }
  });

  window.HypnoAppRevisedBridge = {
    ready: true,
    namespace: NAMESPACE,
    state,
    settings
  };
})();

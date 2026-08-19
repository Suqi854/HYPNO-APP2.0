(() => {
  "use strict";

  const NAMESPACE = "hypno-app-revised";
  const SETTINGS_KEY = "hypno-app-revised:settings:v1";
  const STATE_KEY = "hypno-app-revised:state:v1";
  const handlers = new Map();

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

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

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
      // 私密或存储不可用时仍保持内存状态。
    }
  }

  let state = {
    ...defaultState(),
    ...loadJson(STATE_KEY, defaultState())
  };
  let settings = {
    ...defaultSettings(),
    ...loadJson(SETTINGS_KEY, defaultSettings())
  };

  function normalizeState(value) {
    const next = {
      ...defaultState(),
      ...(value || {})
    };
    next.roles = Array.isArray(next.roles) ? next.roles : [];
    next.locations = Array.isArray(next.locations) ? next.locations : [];
    next.rules = Array.isArray(next.rules) ? next.rules : [];
    next.crack = { mc: false, money: false, vip: false, ...(next.crack || {}) };
    return next;
  }

  function normalizeSettings(value) {
    return {
      ...defaultSettings(),
      ...(value || {})
    };
  }

  state = normalizeState(state);
  settings = normalizeSettings(settings);

  async function getWorldInfo() {
    const st = globalThis.SillyTavern || {};
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
    const st = globalThis.SillyTavern || {};
    if (typeof st.saveWorldInfo === "function") {
      await st.saveWorldInfo(world);
    } else if (typeof st.getCharacterCardFields === "function") {
      const fields = st.getCharacterCardFields();
      if (fields) fields.character_book = world;
    }
    if (typeof st.reloadWorldInfoEditor === "function") st.reloadWorldInfoEditor();
    if (typeof st.updateWorldInfoList === "function") st.updateWorldInfoList();
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
      extensions: {
        position: 0,
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
      }
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

    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const comment = entries[index].comment || "";
      if (
        comment.startsWith("[角色-人设]") ||
        comment.startsWith("[角色-变量]") ||
        comment.startsWith("[档案]") ||
        comment.startsWith("[地点]") ||
        comment.startsWith("[规则]") ||
        comment === "剧情大纲"
      ) {
        entries.splice(index, 1);
      }
    }

    for (const role of state.roles) {
      const name = String(role.name || role.draft?.persona?.姓名 || "未命名角色");
      const aliases = Array.isArray(role.draft?.persona?.别名) ? role.draft.persona.别名 : [];
      entries.push(makeEntry(`[角色-人设]${name}`, personaText(role), [name, ...aliases], (order += 1)));
      entries.push(makeEntry(`[角色-变量]${name}`, variablesText(role), [name, `${name}变量`], (order += 1)));
      entries.push(makeEntry(`[档案]${name}`, `<角色档案>\n${personaText(role)}\n\n变量:\n${variablesText(role)}\n</角色档案>`, [name], (order += 1)));
    }

    for (const location of state.locations) {
      const name = String(location.name || "未命名地点");
      entries.push(makeEntry(`[地点]${name}`, `<地点>\n名称: ${name}\n描述: ${location.description || ""}\n</地点>`, [name], (order += 1)));
    }

    for (const rule of state.rules) {
      entries.push(makeEntry(`[规则]${rule.id}`, `<规则>\n类型: ${rule.type || "永久"}\n范围: ${rule.scope || "整个故事"}\n时间: ${rule.time || "永久"}\n内容: ${rule.text || ""}\n</规则>`, [], (order += 1)));
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
    const mvu = globalThis.Mvu;
    if (!mvu) return;
    let data = typeof mvu.getMvuData === "function" ? mvu.getMvuData() : null;
    if (!data || typeof data !== "object") data = {};
    if (!data.stat_data || typeof data.stat_data !== "object") data.stat_data = {};
    const roleData = {};
    for (const role of state.roles) {
      const name = String(role.name || role.draft?.persona?.姓名 || "未命名角色");
      roleData[name] = role.draft?.variables || {};
    }
    data.stat_data.角色 = roleData;
    const currentCharacters = Array.isArray(data.stat_data.系统?.当前出场角色)
      ? data.stat_data.系统.当前出场角色.filter((name) => roleData[name])
      : [];
    data.stat_data.系统 = {
      ...(data.stat_data.系统 || {}),
      当前出场角色: currentCharacters
    };
    if (typeof mvu.replaceMvuData === "function") await mvu.replaceMvuData(data);
  }

  function register(action, handler) {
    handlers.set(action, handler);
  }

  async function handle(action, payload = {}) {
    const handler = handlers.get(action);
    if (!handler) throw new Error(`未知操作：${action}`);
    return handler(payload);
  }

  globalThis.addEventListener("message", async (event) => {
    const data = event.data;
    if (!data || data.namespace !== NAMESPACE || data.type !== "request" || !data.id) return;
    try {
      const result = await handle(data.action, data.payload || {});
      event.source?.postMessage?.({ namespace: NAMESPACE, type: "response", id: data.id, ok: true, result }, "*");
    } catch (error) {
      event.source?.postMessage?.({ namespace: NAMESPACE, type: "response", id: data.id, ok: false, error: error.message || "操作失败" }, "*");
    }
  });

  globalThis.HypnoAppRevisedCore = {
    namespace: NAMESPACE,
    register,
    handle,
    clone,
    getState: () => clone(normalizeState(state)),
    setState(next) {
      state = normalizeState(next);
      saveJson(STATE_KEY, state);
      return clone(state);
    },
    getSettings: () => clone(normalizeSettings(settings)),
    setSettings(next) {
      settings = normalizeSettings(next);
      saveJson(SETTINGS_KEY, settings);
      return clone(settings);
    },
    getWorldInfo,
    saveWorldInfo,
    syncWorldbook,
    syncMvu,
    makeEntry,
    personaText,
    variablesText,
    normalizeState,
    normalizeSettings
  };
})();

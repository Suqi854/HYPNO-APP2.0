(() => {
  "use strict";

  const core = globalThis.HypnoAppRevisedCore;
  const api = globalThis.HypnoAppRevisedApi;
  if (!core || !api) return;

  async function generateRole(text) {
    const settings = core.getSettings();
    const messages = [
      {
        role: "system",
        content: "你是角色卡生成器。请只输出一个合法JSON对象，包含persona和variables两部分。persona至少包含姓名、性别、年龄、身份、外貌、性格、背景、NSFW和关系。variables使用九页结构：衣着、信息、状态、事件、敏感、效果、劣迹、改造、物品。"
      },
      { role: "user", content: String(text || "") }
    ];
    let result;
    if (settings.mode === "tavern") {
      if (typeof globalThis.generate === "function") {
        const raw = await globalThis.generate({ prompt: messages.map((message) => message.content).join("\n"), json_mode: true });
        result = api.parseJsonText(raw) || { content: raw };
      } else if (typeof globalThis.SillyTavern?.generateQuietPrompt === "function") {
        const raw = await globalThis.SillyTavern.generateQuietPrompt(messages);
        result = api.parseJsonText(raw) || { content: raw };
      } else {
        throw new Error("当前酒馆环境没有可用的生成桥");
      }
    } else {
      result = await api.callCustomChat(messages, true);
    }
    if (result.persona || result.variables) return result;
    if (result.content) return { persona: { 姓名: "未命名角色", 背景: result.content }, variables: {} };
    return result;
  }

  async function confirmRole(payload) {
    const draft = payload.draft;
    const name = String(draft?.persona?.姓名 || draft?.persona?.name || "未命名角色");
    const state = core.getState();
    state.roles = state.roles.filter((item) => item.name !== name);
    state.roles.push({ name, draft });
    core.setState(state);
    await core.syncWorldbook();
    await core.syncMvu();
    return core.getState();
  }

  async function deleteRole(payload) {
    const state = core.getState();
    state.roles = state.roles.filter((item) => item.name !== payload.name);
    core.setState(state);
    await core.syncWorldbook();
    await core.syncMvu();
    return core.getState();
  }

  core.register("role:generate", (payload) => generateRole(payload.text || ""));
  core.register("role:confirm", confirmRole);
  core.register("role:delete", deleteRole);

  globalThis.HypnoAppRevisedRoleBridge = {
    generateRole,
    confirmRole,
    deleteRole
  };
})();

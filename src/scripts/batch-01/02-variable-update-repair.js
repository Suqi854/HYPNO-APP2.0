(() => {
  "use strict";

  const GLOBAL_KEY = "__HYPNO_APP_REVISED_VARIABLE_REPAIR_V1__";
  const state = globalThis[GLOBAL_KEY] ||= { registered: false };

  function repairMissingValue(text) {
    const source = String(text || "").trim();
    if (!source.startsWith("[") || !source.endsWith("]")) return null;
    let repaired = false;
    let output = "";
    let cursor = 0;
    const pattern = /\{\s*"op"\s*:\s*"(?:add|replace)"\s*,\s*"path"\s*:\s*"(?:\\.|[^"\\])*"\s*:\s*(?=\s*[\[{])/g;
    for (const match of source.matchAll(pattern)) {
      const start = match.index ?? -1;
      if (start < 0) continue;
      const fragment = match[0];
      const separator = fragment.lastIndexOf(":");
      if (separator < 0) continue;
      output += source.slice(cursor, start);
      output += `${fragment.slice(0, separator)},"value":${fragment.slice(separator + 1)}`;
      cursor = start + fragment.length;
      repaired = true;
    }
    if (!repaired) return null;
    return output + source.slice(cursor);
  }

  function protectRoleRoots(commands) {
    if (!Array.isArray(commands)) return commands;
    return commands.filter((command) => {
      if (!command || typeof command !== "object") return false;
      const path = String(command.path || "");
      if (!path.startsWith("/角色")) return true;
      const parts = path.split("/").filter(Boolean);
      return parts.length > 2;
    });
  }

  function handleParsed(commands) {
    const repairedText = repairMissingValue(commands);
    const protectedCommands = protectRoleRoots(commands);
    return typeof repairedText === "string" ? repairedText : protectedCommands;
  }

  function register() {
    if (state.registered) return true;
    const eventName = globalThis.Mvu?.events?.COMMAND_PARSED;
    if (!eventName || typeof globalThis.eventOn !== "function") return false;
    globalThis.eventOn(eventName, handleParsed);
    state.registered = true;
    return true;
  }

  globalThis.HypnoAppRevisedVariableRepair = {
    repairMissingValue,
    protectRoleRoots,
    handleParsed,
    register
  };

  register();
})();

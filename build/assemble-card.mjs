import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const srcRoot = path.join(root, "src");
const distRoot = path.join(root, "dist");
const cardName = "催眠APP（改）";
const remoteCommit = process.env.HYPNO_APP_REMOTE_COMMIT || "main";
const remoteBase = `https://cdn.jsdelivr.net/gh/Suqi854/HYPNO-APP2.0@${remoteCommit}`;
const bootstrapUrl = `${remoteBase}/dist/webview/floating-bootstrap.js`;
const frontendUrl = `${remoteBase}/dist/webview/st-load-inline.html`;
const assetBase = `${remoteBase}/dist/webview/assets/`;

function readText(relative) {
  return fs.readFileSync(path.join(srcRoot, relative), "utf8");
}

function writeText(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function relativePath(full) {
  return path.relative(root, full).replaceAll("\\", "/");
}

function sortFiles(files) {
  return files.sort((a, b) => relativePath(a).localeCompare(relativePath(b), "zh-CN"));
}

const worldCommentMap = {
  "system-variable-list": "系统变量列表",
  "role-variable-template": "角色变量模板",
  "location-variable-and-rules": "地点变量与地点规则",
  "rule-variable": "规则变量",
  "inventory-variables": "库存物品变量",
  "course-schedule": "课程表变量",
  "school-rules": "校规变量",
  "body-stats": "身体状态",
  "current-role-scope": "当前出场角色变量范围",
  "active-hypnosis-effects": "当前有效催眠效果角色",
  "long-term-modification": "长期改造生效",
  "vice-records": "劣迹记录",
  "character-list": "人物列表",
  "app-archive": "APP档案"
};

function deriveWorldComment(content, filename) {
  const key = filename.replace(/\.txt$/i, "").replace(/^\d+-/, "");
  if (worldCommentMap[key]) return worldCommentMap[key];
  const trimmed = String(content || "").trim();
  const tag = trimmed.match(/^<([^>\n]+)>/);
  if (tag) return tag[1].trim();
  return key;
}

function worldbookEntries() {
  const roots = [
    "src/card/worldbook-batch-01",
    "src/card/worldbook-batch-02",
    "src/card/worldbook-batch-03",
    "src/card/worldbook-batch-04",
    "src/card/worldbook-batch-05"
  ];
  const files = sortFiles(roots.flatMap((dir) => walk(path.join(root, dir)).filter((file) => file.endsWith(".txt"))));
  return files.map((file, index) => {
    const content = fs.readFileSync(file, "utf8");
    return {
      id: index + 1,
      keys: [],
      secondary_keys: [],
      comment: deriveWorldComment(content, path.basename(file)),
      content,
      constant: true,
      selective: false,
      insertion_order: 100 + index,
      enabled: true,
      position: "before_char",
      use_regex: true,
      extensions: {
        position: 0,
        exclude_recursion: false,
        display_index: index,
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
  });
}

function scriptObject(name, content, enabled = true) {
  return {
    type: "script",
    enabled,
    name,
    id: crypto.randomUUID(),
    content,
    info: "",
    button: { enabled: false, buttons: [] },
    data: {},
    export_with: { data: true, button: false }
  };
}

function remoteConfigScript() {
  const content = [
    "(() => {",
    "  globalThis.HypnoAppRevisedRemoteConfig = {",
    `    bootstrapUrl: ${JSON.stringify(bootstrapUrl)},`,
    `    frontendUrl: ${JSON.stringify(frontendUrl)},`,
    `    assetBase: ${JSON.stringify(assetBase)},`,
    `    revision: ${JSON.stringify(remoteCommit)}`,
    "  };",
    "})();"
  ].join("\n");
  return scriptObject("远程配置", content, true);
}

function tavernScripts() {
  const dirs = [
    "src/scripts/batch-01",
    "src/scripts/batch-02",
    "src/scripts/batch-03"
  ];
  const files = sortFiles(dirs.flatMap((dir) => walk(path.join(root, dir)).filter((file) => file.endsWith(".js"))));
  const scripts = [];
  for (const file of files) {
    const relative = relativePath(file);
    const content = fs.readFileSync(file, "utf8");
    const name = path.basename(file, ".js");
    const disabled = relative.endsWith("/02-character-performance.js");
    scripts.push(scriptObject(name, content, !disabled));
  }
  const hostIndex = scripts.findIndex((script) => script.name === "01-remote-host-loader");
  if (hostIndex >= 0) scripts.splice(hostIndex, 0, remoteConfigScript());
  return scripts;
}

function regexScripts() {
  const dirs = [
    "src/regex/batch-01",
    "src/regex/batch-02"
  ];
  const files = sortFiles(dirs.flatMap((dir) => walk(path.join(root, dir)).filter((file) => file.endsWith(".json"))));
  return files.map((file) => {
    const source = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      id: crypto.randomUUID(),
      scriptName: source.scriptName || path.basename(file, ".json"),
      findRegex: source.findRegex,
      replaceString: String(source.replaceString || "").replaceAll("__HYPNO_FRONTEND_URL__", frontendUrl),
      minDepth: source.minDepth ?? null,
      maxDepth: source.maxDepth ?? 4,
      trimStrings: Array.isArray(source.trimStrings) ? source.trimStrings : [],
      placement: Array.isArray(source.placement) ? source.placement : [2],
      disabled: source.disabled !== false,
      markdownOnly: source.markdownOnly !== false,
      promptOnly: source.promptOnly === true,
      runOnEdit: source.runOnEdit !== false,
      substituteRegex: source.substituteRegex ?? 0
    };
  });
}

function buildWebview() {
  const html = readText("webview/index.html");
  const css = readText("webview/styles.css");
  const js = readText("webview/app.js");
  const inline = html.replace("/*__APP_CSS__*/", () => css).replace("/*__APP_JS__*/", () => js);
  const target = path.join(distRoot, "webview", "st-load-inline.html");
  writeText(target, inline);
  writeText(path.join(distRoot, "webview", "floating-bootstrap.js"), readText("webview/floating-bootstrap.js"));
  return target;
}

function createCard(entries, scripts, regexes) {
  return {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name: cardName,
      description: "通用催眠APP（改）。玩家配置API，生成角色、地点、规则和剧情，自行创建首楼。",
      personality: "",
      scenario: "",
      first_mes: "首楼由玩家创建。\n\n<HYPNO_APP_REVISED_IMPL>",
      mes_example: "",
      creator_notes: "First Playable modular build",
      system_prompt: readText("card/system-prompt.txt"),
      post_history_instructions: readText("card/post-history-instructions.txt"),
      tags: [],
      creator: "Suqi854",
      character_version: "0.2.0",
      alternate_greetings: [],
      extensions: {
        talkativeness: "0.5",
        fav: false,
        world: "",
        depth_prompt: { prompt: "", depth: 4, role: "system" },
        tavern_helper: {
          scripts,
          variables: {}
        },
        regex_scripts: regexes,
        workbench: {
          legacyWorldbookAndRegexPreserved: false,
          updatedAt: new Date().toISOString(),
          frontendMode: "remote",
          frontendUrl,
          remoteFrontendUrl: frontendUrl,
          bootstrapUrl,
          assetBase,
          remoteAssetBase: assetBase,
          remoteCommit,
          frontendLoader: "hypno-floating-bootstrap",
          version: "0.2.0",
          modules: [
            "hypnosis-app",
            "body-stats",
            "add-role",
            "locations",
            "rules",
            "plot",
            "api",
            "icon",
            "crack",
            "calendar",
            "clock",
            "inventory",
            "dispatch",
            "work",
            "encounter"
          ]
        }
      },
      group_only_greetings: false,
      character_book: {
        name: cardName,
        entries
      }
    }
  };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function encodePngCard(jsonText) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlib.deflateSync(Buffer.from([0, 0, 0, 0, 0]));
  const base64 = Buffer.from(jsonText, "utf8").toString("base64");
  const textData = Buffer.concat([Buffer.from("chara\0", "ascii"), Buffer.from(base64, "ascii")]);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("tEXt", textData),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function validate(card, webviewTarget, jsonTarget, pngTarget) {
  const errors = [];
  const jsonText = JSON.stringify(card);
  if (card.data.name !== cardName) errors.push("card name mismatch");
  if (card.data.character_book.entries.length < 25) errors.push("worldbook entries too few");
  if (card.data.extensions.tavern_helper.scripts.length < 10) errors.push("scripts too few");
  if (card.data.extensions.regex_scripts.length < 8) errors.push("regex scripts too few");
  if (!card.data.extensions.workbench.frontendUrl.includes(remoteBase)) errors.push("remote URL missing");
  if (
    jsonText.includes("__HYPNO_BOOTSTRAP_URL__") ||
    jsonText.includes("__HYPNO_FRONTEND_URL__") ||
    jsonText.includes("__HYPNO_ASSET_BASE__") ||
    jsonText.includes("__HYPNO_REVISION__")
  ) {
    errors.push("remote placeholder remains");
  }
  if (/犬冢夏美|西园寺爱丽莎|月咏深雪|九鬼真白|私立斋明学园|明德大学|热带雨林区|旧图书馆塔楼|子嗣/.test(jsonText)) {
    errors.push("fixed content or child rule remains");
  }
  const webview = fs.readFileSync(webviewTarget, "utf8");
  if (!webview.includes("hypno-app-revised")) errors.push("webview namespace missing");
  const png = fs.readFileSync(pngTarget);
  if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") errors.push("PNG signature invalid");
  const parsed = JSON.parse(fs.readFileSync(jsonTarget, "utf8"));
  if (parsed.data.name !== cardName) errors.push("JSON card mismatch");
  return errors;
}

const webviewTarget = buildWebview();
const entries = worldbookEntries();
const scripts = tavernScripts();
const regexes = regexScripts();
const card = createCard(entries, scripts, regexes);
const jsonText = `${JSON.stringify(card, null, 2)}\n`;
const jsonTarget = path.join(distRoot, "card", `${cardName}.json`);
const pngTarget = path.join(distRoot, "card", `${cardName}.png`);
writeText(jsonTarget, jsonText);
fs.writeFileSync(pngTarget, encodePngCard(jsonText));

const errors = validate(card, webviewTarget, jsonTarget, pngTarget);
if (errors.length) throw new Error(`validation failed:\n${errors.join("\n")}`);

const manifest = {
  schemaVersion: 1,
  cardName,
  version: "0.2.0",
  remoteBase,
  bootstrapUrl,
  frontendUrl,
  remoteCommit,
  builtAt: new Date().toISOString(),
  artifacts: {
    json: path.relative(root, jsonTarget).replaceAll("\\", "/"),
    png: path.relative(root, pngTarget).replaceAll("\\", "/"),
    webview: path.relative(root, webviewTarget).replaceAll("\\", "/"),
    bootstrap: "dist/webview/floating-bootstrap.js"
  },
  checks: {
    worldbookEntries: entries.length,
    tavernScripts: scripts.length,
    regexScripts: regexes.length
  }
};

writeText(path.join(distRoot, "build-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));

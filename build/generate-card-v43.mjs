import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const srcRoot = path.join(root, "src");
const distRoot = path.join(root, "dist");
const sourceCardPath = "E:/sillytavern/催眠APP/催眠app二改 v4.3（louisHM 完全免费）.json";
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

const replacements = [
  ["催眠app二改 v4.3（louisHM 完全免费）", cardName],
  ["私立斋明学园", "故事主要地点"],
  ["斋明学园", "故事主要地点"],
  ["明德大学", "故事中的大学"],
  ["热带雨林区", "自定义地点"],
  ["旧图书馆塔楼“巴别”", "自定义地点"],
  ["巴别", "自定义地点"],
  ["犬冢夏美", "当前角色"],
  ["西园寺爱丽莎", "当前角色"],
  ["月咏深雪", "当前角色"],
  ["九鬼真白", "当前角色"],
  ["阿宅", "当前角色"]
];

function cleanText(value) {
  let text = String(value ?? "");
  for (const [from, to] of replacements) text = text.replaceAll(from, to);
  return text;
}

function cleanDeep(value) {
  if (typeof value === "string") return cleanText(value);
  if (Array.isArray(value)) return value.map(cleanDeep);
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, item] of Object.entries(value)) next[cleanText(key)] = cleanDeep(item);
    return next;
  }
  return value;
}

const blockedWorldComments = new Set([
  "[mvu_update]成就与任务回馈机制",
  "[mvu_update]APP操作-成就任务",
  "[mvu_plot]热带雨林区",
  "[mvu_plot]旧图书馆塔楼“巴别”",
  "[mvu_plot]学校简介和地点列表-明德大学",
  "[mvu_plot]西园寺爱丽莎好感事件链",
  "[mvu_plot]阿宅人设",
  "西园寺爱丽莎变量",
  "月咏深雪变量",
  "犬冢夏美变量",
  "[mvu_plot]西园寺爱丽莎人设",
  "[mvu_plot]月咏深雪人设",
  "[mvu_plot]犬冢夏美人设",
  "[mvu_plot]月咏深雪好感事件链",
  "[mvu_plot]犬冢夏美好感事件链",
  "[mvu_plot]阿宅好感事件链",
  "[mvu_plot]阿宅女性化人设",
  "阿宅变量",
  "作弊模式",
  "[mvu_plot]首楼互斥开场世界书",
  "[mvu_plot]私立斋明学园设定",
  "[mvu_plot]特殊地点目录",
  "[mvu_plot]地图地点目录",
  "[mvu_update]首楼身份选择规则"
]);

const disabledScriptNames = new Set([
  "（关闭派遣中尾段请关这个）派遣中收束协议",
  "（关闭九鬼施虐尾段请关这个）九鬼真白施虐收束协议",
  "备用开场白变量初始化",
  "未完成任务动态注入"
]);

const disabledRegexNames = new Set([
  "派遣中尾段美化",
  "九鬼真白施虐尾段美化",
  "首楼身份选择前端"
]);

function transformWorldbook(worldbook) {
  const entries = worldbook.entries
    .filter((entry) => !blockedWorldComments.has(entry.comment))
    .map((entry) => {
      const next = clone(entry);
      next.comment = cleanText(next.comment);
      next.content = cleanText(next.content);
      next.keys = (next.keys || []).map(cleanText);
      next.secondary_keys = (next.secondary_keys || []).map(cleanText);
      return next;
    });

  if (!entries.some((entry) => entry.comment === "APP档案")) {
    entries.push({
      id: Date.now(),
      keys: [],
      secondary_keys: [],
      comment: "APP档案",
      content: "APP档案:\n- 暂无角色",
      constant: true,
      selective: false,
      insertion_order: 90,
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
    });
  }

  worldbook.name = cardName;
  worldbook.entries = entries;
  return worldbook;
}

function transformScripts(scripts) {
  const next = [];
  for (const script of scripts) {
    const item = clone(script);
    item.name = cleanText(item.name);
    item.info = cleanText(item.info || "");
    item.content = cleanText(item.content || "");
    if (disabledScriptNames.has(script.name)) item.enabled = false;
    if (script.name.includes("悬浮手机宿主启动器")) {
      item.content = item.content
        .replaceAll("https://cdn.jsdelivr.net/gh/5zyzz4msvd-spec/HApp5@db71f7715f86aa2be0210c1602843c66c2792139/dist/webview/floating-bootstrap.js", bootstrapUrl)
        .replaceAll("https://cdn.jsdelivr.net/gh/5zyzz4msvd-spec/HApp5@db71f7715f86aa2be0210c1602843c66c2792139/dist/phone/st-load-inline.html", frontendUrl)
        .replaceAll("https://cdn.jsdelivr.net/gh/5zyzz4msvd-spec/HApp5@db71f7715f86aa2be0210c1602843c66c2792139/dist/webview/assets/", assetBase)
        .replaceAll("db71f7715f86aa2be0210c1602843c66c2792139", remoteCommit);
    }
    next.push(item);
  }

  next.push({
    type: "script",
    enabled: true,
    name: "催眠APP（改）API与世界书桥",
    id: crypto.randomUUID(),
    content: readText("card/bridge-script.js"),
    info: "负责 API 设置、角色草稿生成、角色确认和删除、地点/规则/剧情写入世界书、APP 档案和 MVU 同步。",
    button: { enabled: false, buttons: [] },
    data: {},
    export_with: { data: true, button: false }
  });
  return next;
}

function transformRegex(scripts) {
  return scripts.map((script) => {
    const item = clone(script);
    item.scriptName = cleanText(item.scriptName || "");
    item.replaceString = cleanText(item.replaceString || "");
    if (disabledRegexNames.has(script.scriptName)) {
      item.disabled = true;
      item.replaceString = "";
    }
    return item;
  });
}

function createCard() {
  const source = JSON.parse(fs.readFileSync(sourceCardPath, "utf8"));
  const card = clone(source);
  const data = card.data;

  data.name = cardName;
  data.description = "通用催眠APP（改）。基于 v4.3 保留主要模块和脚本，删除固定角色、地点、成就任务，新增 API、规则、剧情、图标、破解版。";
  data.personality = cleanText(data.personality || "");
  data.scenario = cleanText(data.scenario || "");
  data.first_mes = "首楼由玩家创建。\n\nHypnoOS 将作为悬浮手机加载，请使用右侧悬浮按钮打开 APP。";
  data.mes_example = "";
  data.creator_notes = "First Playable based on v4.3";
  data.system_prompt = `${cleanText(data.system_prompt || "")}\n\n${readText("card/system-prompt.txt")}`;
  data.post_history_instructions = `${cleanText(data.post_history_instructions || "")}\n\n${readText("card/post-history-instructions.txt")}`;
  data.alternate_greetings = [];
  data.character_book = transformWorldbook(data.character_book);
  data.extensions.tavern_helper.scripts = transformScripts(data.extensions.tavern_helper.scripts || []);
  data.extensions.regex_scripts = transformRegex(data.extensions.regex_scripts || []);
  data.extensions.workbench = data.extensions.workbench || {};
  data.extensions.workbench.legacyWorldbookAndRegexPreserved = true;
  data.extensions.workbench.frontendMode = "remote";
  data.extensions.workbench.frontendUrl = frontendUrl;
  data.extensions.workbench.remoteFrontendUrl = frontendUrl;
  data.extensions.workbench.remoteAssetBase = assetBase;
  data.extensions.workbench.assetBase = assetBase;
  data.extensions.workbench.remoteCommit = remoteCommit;
  data.extensions.workbench.frontendLoader = "hypnoos-floating-host";
  data.extensions.workbench.version = "0.1.0";
  data.extensions.workbench.modules = [
    "hypnosis-app",
    "body-stats",
    "add-role",
    "inventory",
    "calendar",
    "clock",
    "mchan-static",
    "rules",
    "plot",
    "api",
    "icon",
    "crack"
  ];

  return card;
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
  if (card.data.name !== cardName) errors.push("card name mismatch");
  if (card.data.character_book.entries.length < 20) errors.push("v4.3 worldbook unexpectedly small");
  if (card.data.extensions.tavern_helper.scripts.length < 8) errors.push("v4.3 scripts unexpectedly missing");
  if (card.data.extensions.regex_scripts.length < 14) errors.push("v4.3 regex scripts unexpectedly missing");
  if (!card.data.extensions.tavern_helper.scripts.some((item) => item.name.includes("API与世界书桥"))) errors.push("new bridge script missing");
  if (!card.data.extensions.workbench.frontendUrl.includes(remoteBase)) errors.push("remote frontend URL missing");
  const webview = fs.readFileSync(webviewTarget, "utf8");
  if (!webview.includes("hypno-app-revised")) errors.push("webview namespace missing");
  const png = fs.readFileSync(pngTarget);
  if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") errors.push("PNG signature invalid");
  const parsedJson = JSON.parse(fs.readFileSync(jsonTarget, "utf8"));
  if (parsedJson.data.name !== cardName) errors.push("JSON card mismatch");
  return errors;
}

const webviewTarget = buildWebview();
const card = cleanDeep(createCard());
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
  version: "0.1.0",
  source: "v4.3",
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
    worldbookEntries: card.data.character_book.entries.length,
    tavernScripts: card.data.extensions.tavern_helper.scripts.length,
    regexScripts: card.data.extensions.regex_scripts.length
  }
};

writeText(path.join(distRoot, "build-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));

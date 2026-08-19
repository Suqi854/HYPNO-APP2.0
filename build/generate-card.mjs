import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const srcRoot = path.join(root, "src");
const distRoot = path.join(root, "dist");
const webviewDist = path.join(distRoot, "webview");
const cardDist = path.join(distRoot, "card");

const remoteUrl =
  process.env.HYPNO_APP_REMOTE_URL ||
  "https://cdn.jsdelivr.net/gh/Suqi854/HYPNO-APP2.0@main/dist/webview/st-load-inline.html";
const cardName = "催眠APP（改）";

function readText(relative) {
  return fs.readFileSync(path.join(srcRoot, relative), "utf8");
}

function writeText(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function buildWebview() {
  const html = readText("webview/index.html");
  const css = readText("webview/styles.css");
  const js = readText("webview/app.js");
  const inline = html
    .replace("/*__APP_CSS__*/", () => css)
    .replace("/*__APP_JS__*/", () => js);
  const target = path.join(webviewDist, "st-load-inline.html");
  writeText(target, inline);
  return target;
}

function createCard() {
  const bridgeScript = readText("card/bridge-script.js");
  const systemPrompt = readText("card/system-prompt.txt");
  const postHistory = readText("card/post-history-instructions.txt");
  const initialWorldbook = JSON.parse(readText("card/initial-worldbook.json"));
  const bridgeId = crypto.randomUUID();
  const regexId = crypto.randomUUID();

  const iframeMarkup = [
    `<iframe id="hypno-app-revised-frame" title="${cardName}" src="${remoteUrl}"`,
    ` style="width:100%;height:calc(100dvh - 68px);min-height:620px;border:0;background:#111827;display:block;"`,
    ` allow="clipboard-read; clipboard-write"></iframe>`
  ].join("");

  const bridge = {
    type: "script",
    enabled: true,
    name: "催眠APP（改）桥接脚本",
    id: bridgeId,
    content: bridgeScript,
    info: "在酒馆页面运行。负责 API 设置、角色与地点生成、世界书写入、APP 档案同步和 MVU 状态同步；不向正文注入密钥或破解版剧情。",
    button: {
      enabled: false,
      buttons: []
    },
    data: {},
    export_with: {
      data: true,
      button: false
    }
  };

  const regex = {
    id: regexId,
    scriptName: "催眠APP（改）远程前端",
    findRegex: "/<\\s*HYPNO_APP_REVISED_IMPL\\s*>/g",
    replaceString: iframeMarkup,
    minDepth: null,
    maxDepth: 4,
    trimStrings: [],
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: true,
    substituteRegex: 0
  };

  return {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name: cardName,
      description: "通用催眠APP（改）。玩家配置 API，生成角色、地点、规则和剧情，自行创建首楼。",
      personality: "",
      scenario: "",
      first_mes: "<HYPNO_APP_REVISED_IMPL>",
      mes_example: "",
      creator_notes: "First Playable 0.1.0。GitHub/jsdelivr 远程加载。",
      system_prompt: systemPrompt,
      post_history_instructions: postHistory,
      tags: [],
      creator: "Suqi854",
      character_version: "0.1.0",
      alternate_greetings: [],
      extensions: {
        talkativeness: "0.5",
        fav: false,
        world: "",
        depth_prompt: {
          prompt: "",
          depth: 4,
          role: "system"
        },
        tavern_helper: {
          scripts: [bridge],
          variables: {}
        },
        regex_scripts: [regex],
        workbench: {
          legacyWorldbookAndRegexPreserved: false,
          updatedAt: new Date().toISOString(),
          frontendMode: "remote",
          frontendUrl: remoteUrl,
          remoteFrontendUrl: remoteUrl,
          assetBase: "",
          remoteAssetBase: "",
          remoteCommit: "main",
          frontendLoader: "iframe-remote-regex",
          version: "0.1.0",
          modules: [
            "hypnosis-app",
            "add-role",
            "locations",
            "rules",
            "plot",
            "api",
            "icon",
            "crack",
            "calendar"
          ]
        }
      },
      group_only_greetings: false,
      character_book: initialWorldbook
    }
  };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
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
  const rawImage = Buffer.from([0, 0, 0, 0, 0]);
  const idat = zlib.deflateSync(rawImage);
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

function validateArtifacts(jsonTarget, pngTarget, webviewTarget) {
  const errors = [];
  const card = JSON.parse(fs.readFileSync(jsonTarget, "utf8"));
  if (card.data.name !== cardName) errors.push("card name mismatch");
  if (card.data.first_mes !== "<HYPNO_APP_REVISED_IMPL>") errors.push("first_mes placeholder mismatch");
  if (card.data.extensions.regex_scripts.length !== 1) errors.push("expected one display regex");
  if (card.data.extensions.tavern_helper.scripts.length !== 1) errors.push("expected one bridge script");
  if (!card.data.extensions.tavern_helper.scripts[0].content.includes("hypno-app-revised")) {
    errors.push("bridge script namespace missing");
  }
  if (!card.data.extensions.regex_scripts[0].replaceString.includes(remoteUrl)) errors.push("remote URL missing");
  if (card.data.character_book.entries.length < 4) errors.push("initial worldbook entries missing");
  const png = fs.readFileSync(pngTarget);
  if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") errors.push("PNG signature invalid");
  const webview = fs.readFileSync(webviewTarget, "utf8");
  if (!webview.includes("hypno-app-revised")) errors.push("webview namespace missing");
  if (webview.includes("/*__APP_CSS__*/") || webview.includes("/*__APP_JS__*/")) errors.push("webview placeholders not replaced");
  return { errors, card };
}

const webviewTarget = buildWebview();
const card = createCard();
const jsonText = `${JSON.stringify(card, null, 2)}\n`;
const jsonTarget = path.join(cardDist, `${cardName}.json`);
const pngTarget = path.join(cardDist, `${cardName}.png`);
writeText(jsonTarget, jsonText);
fs.writeFileSync(pngTarget, encodePngCard(jsonText));

const { errors, card: validatedCard } = validateArtifacts(jsonTarget, pngTarget, webviewTarget);
if (errors.length) {
  throw new Error(`artifact validation failed:\n${errors.join("\n")}`);
}

const manifest = {
  schemaVersion: 1,
  cardName,
  version: "0.1.0",
  remoteUrl,
  remoteCommit: "main",
  builtAt: new Date().toISOString(),
  artifacts: {
    json: path.relative(root, jsonTarget).replaceAll("\\", "/"),
    png: path.relative(root, pngTarget).replaceAll("\\", "/"),
    webview: path.relative(root, webviewTarget).replaceAll("\\", "/")
  },
  checks: {
    worldbookEntries: validatedCard.data.character_book.entries.length,
    bridgeScripts: validatedCard.data.extensions.tavern_helper.scripts.length,
    regexScripts: validatedCard.data.extensions.regex_scripts.length,
    apiKeyFieldReferenced: JSON.stringify(validatedCard).includes("apiKey")
  }
};

writeText(path.join(distRoot, "build-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));

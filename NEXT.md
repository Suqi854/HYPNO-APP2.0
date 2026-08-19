---
handoff_schema: tavernweave/next/v1
project_id: hypno-app-gai
status: implementation-candidate
updated: 2026-08-19
---

# NEXT · 催眠APP（改）

## 当前权威

- 总设计案：`总设计案.md`
- 活动蓝图：`蓝图集/BLUEPRINT_INDEX.md`
- 执行期持久权威蓝图预算：`0`
- 临时问题支线：仅真实问题触发，最多一层/同时一条，关闭后回归父步骤

## 已确认事实

- 新卡为 `催眠APP（改）`，采用 GitHub/jsdelivr 远程 HypnoOS 前端。
- v4.3 仅重点参考，主要玩法模块保留并通用化，去掉成就与任务。
- 新增 API、规则、剧情、图标、破解版。
- 中国日历使用新历公历、节气、中国法定节假日和常见西方节日。
- 角色生成先预览，玩家确认后同步写入世界书、APP 档案和 MVU。
- 删除角色时同步清理世界书关联条目、APP 档案和 MVU。
- GitHub 目标仓库 `Suqi854/HYPNO-APP2.0` 已确认存在且为空；已授权方案通过后初始化 Git 和推送。
- First Playable 已实现轻量远程 HypnoOS 前端、桥接脚本、初始世界书和 JSON/PNG 构建器。
- 已改回从 v4.3 原始卡派生：保留 12 个原脚本和 17 个原正则，其中 4 个固定脚本、3 个固定正则默认停用，并新增 API/世界书桥脚本。

## 最近证据

- v4.3 卡内确认：74 条世界书、12 个 Tavern Helper 脚本、17 个正则、`legacyWorldbookAndRegexPreserved=true`、`frontendMode=remote`。
- `1/HypnosisAPP5` 为可用 HypnoOS 前端与构建源码底座。
- CM APP 已有通用世界书写入桥可参考。
- GitHub 只读检查显示仓库存在但无 HEAD、分支或标签。
- TavernWeave Library 路由返回 A0、A2、A3、A4、A6、B1、C10，具体领域文档留到对应蓝图阶段读取。
- `npm run build` 成功，生成 `dist/webview/st-load-inline.html`、`dist/card/催眠APP（改）.json`、`dist/card/催眠APP（改）.png`。
- 构建脚本自检通过：4 条初始世界书、1 个桥接脚本、1 个远程前端正则，PNG 内 `chara` tEXt 可解析。
- 项目权威文件校验通过。
- 本地 Git 已初始化为 `main`，提交 `444a3e4` 已推送到 `origin/main`。
- 推送输出确认 `new branch main -> main`，远端已创建 `main`。

## 开放风险

- 真实 SillyTavern 下 iframe、MVU、远程加载、变量初始化和脚本执行顺序尚未验证。
- API 密钥本地存储和导出脱敏必须在构建门验证。
- 角色生成与删除需要世界书、档案和 MVU 三处事务式一致。
- jsdelivr 缓存刷新尚未验证；远程文件应在推送后稍等一段时间再访问。
- 已通过 `Invoke-WebRequest` 验证远程前端返回 `200`，内容包含 `hypno-app-revised`。
- 已通过 `Invoke-WebRequest` 验证 `floating-bootstrap.js` 和 `st-load-inline.html` 均返回 `200`。
- 新卡世界书 51 条，原脚本 12 条 + 新增桥 1 条，原正则 17 条。
- 真机 SillyTavern 尚未验证 iframe 远程加载、世界书写入、MVU 同步和正则替换。
- 自定义 API 请求可能受目标服务 CORS 限制，需在真实酒馆环境中确认。

## 下一道门

在真实 SillyTavern 中导入 JSON 或 PNG，验证远程前端、角色生成、世界书写入、规则和正文隔离。真机通过后再初始化 Git 和推送。

## 一句续接

读取 `总设计案.md`、`蓝图集/BLUEPRINT_INDEX.md` 和本文件，从真实宿主验证门继续，不重开项目。

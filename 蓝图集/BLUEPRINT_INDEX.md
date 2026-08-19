---
blueprint_schema: tavernweave/blueprint-index/v1
project_id: hypno-app-gai
blueprint_id: BP-ROOT
status: active
runtime_persistent_blueprint_budget: 0
updated: 2026-08-19
---

# 催眠APP（改） · 蓝图集索引

## 总体阶段与依赖

1. 冻结总设计案与 First Playable。
2. 按需提取领域蓝图：前端、卡数据、脚本/正则、构建发布、真机验收。
3. 每个领域蓝图必须有独立输入、输出、停止条件和证据门。
4. 首版闭环完成后停在驾驶员验收，不自动滚入 Growth Tracks。

## 已声明蓝图

当前 `BP-ROOT` 为已确认的蓝图索引。计划提取但尚未创建空壳的领域：

- `BP-01`：HypnoOS 前端与模块。
- `BP-02`：角色卡数据模型、世界书和 prompt。
- `BP-03`：脚本、正则和生成/写入桥。
- `BP-04`：构建、打包、JSON/PNG 与 GitHub 远程发布。
- `BP-05`：真实 SillyTavern 验收。

领域蓝图只有在具备真实输入、输出、边界和停止条件后才创建，不预建空文件。

## 活动阶段合同

- 任意活动步骤只允许由真实问题触发的一层临时问题支线。
- 临时问题支线不扩大产品范围，关闭后必须回到父步骤。
- 执行期持久权威蓝图预算固定为 `0`。

## 跨域接口

- 前端模块通过稳定桥接访问世界书和 MVU。
- 卡数据 schema 是脚本、正则、生成桥和构建工具的共同契约。
- 构建产物固定 jsdelivr commit，真机验证使用同一提交。

## 停止条件

- 首版完成一个角色生成确认和一个角色删除清理闭环。
- 自动化、静态预览和真实宿主证据齐全。
- 驾驶员逐项验收后停在 `driver-accepted`，不自动发布或推送。

## 下一道门

`BP-ROOT` 已激活，First Playable 源码和构建产物已生成。下一道门是真机 SillyTavern 验证，通过后再处理 Git 初始化和推送。

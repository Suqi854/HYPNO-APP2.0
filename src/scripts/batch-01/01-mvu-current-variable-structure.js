(() => {
  "use strict";

  const SCHEMA = {
    roots: ["/系统", "/规则", "/角色"],
    rolePages: ["衣着", "信息", "状态", "事件", "敏感", "效果", "劣迹", "改造", "物品"],
    systemFields: [
      "当前年份",
      "当前日期",
      "当前时间",
      "当前地点",
      "当前事件",
      "当前出场角色",
      "MC能量",
      "MC能量上限",
      "持有零花钱",
      "星光点",
      "催眠APP订阅等级",
      "主角可疑度",
      "_当前周几",
      "_当前日程",
      "_当前特殊日期",
      "_user身份",
      "持有物品",
      "_课程表"
    ],
    roleInfoFields: ["姓名", "性别", "_年龄", "社团或职业", "身高", "体重", "三围", "阴茎长度", "绰号", "绰号已认可"],
    roleStateFields: ["好感度", "警戒度", "服从度", "性欲", "快感值", "是否派遣中"],
    ruleFields: ["名称", "内容", "目标范围", "生效范围", "来源", "地点ID", "地点名", "地图层级", "地点路径", "持续类型"]
  };

  function expose() {
    globalThis.HypnoAppRevisedSchema = SCHEMA;
    try {
      if (typeof globalThis.Mvu?.setSchema === "function") {
        globalThis.Mvu.setSchema(SCHEMA);
      }
    } catch {
      // 没有 setSchema 时仍通过全局对象暴露给其他脚本。
    }
  }

  async function boot() {
    try {
      if (typeof globalThis.waitGlobalInitialized === "function") {
        await globalThis.waitGlobalInitialized("Mvu");
      }
    } catch {
      // 等待失败不阻断暴露。
    }
    expose();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void boot(), { once: true });
  } else {
    void boot();
  }
})();

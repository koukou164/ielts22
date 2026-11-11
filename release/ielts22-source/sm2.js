/* ============================================================================
 * sm2.js — SuperMemo 2（SM-2）间隔重复算法 · 纯函数实现
 * ----------------------------------------------------------------------------
 * 本文件只负责算法与排程计算，不读写 localStorage、不操作 DOM，
 * 便于单独测试，也方便以后替换算法。
 *
 * 标准 SM-2 变量
 *   reps     (n)  连续答对次数
 *   ef       (EF) 难度因子（ease factor），初始 2.5，最低 1.3
 *   interval (I)  当前复习间隔（天）
 *   due           下次到期日（YYYY-MM-DD）
 *
 * 质量分 q（0–5，SM-2 原始定义）
 *   5 完全记得；4 稍作迟疑后答对；3 勉强答对；
 *   2 答错但答案眼熟；1 答错；0 完全遗忘。
 *
 * 本项目 UI 只有 4 档自评，固定映射如下（不可随意改动）：
 *   1 完全不会     → q = 1  （失败，重置）
 *   2 有点印象     → q = 3  （勉强通过）
 *   3 熟悉反应慢   → q = 4  （通过）
 *   4 熟练         → q = 5  （轻松通过）
 *
 * 间隔规则（严格按 SM-2 原始论文，不做简化）
 *   q >= 3（通过）：
 *     reps == 0 → I = 1 天
 *     reps == 1 → I = 6 天
 *     reps >= 2 → I = round(旧 I × 旧 EF)
 *     reps += 1
 *   q < 3（未通过）：
 *     reps = 0，I = 1 天（次日重新学习）
 *
 * EF 更新（每一次评分都执行，包括答错）
 *   EF' = EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02))
 *   若 EF' < 1.3 则取 1.3
 *
 * 注意：SM-2 原文在计算新间隔时使用「更新前」的 EF，本实现保持一致；
 *      EF 的新值只影响下一次复习。
 * ========================================================================== */

(function (global) {
  'use strict';

  var MIN_EF = 1.3;       // SM-2 规定的最低难度因子
  var INITIAL_EF = 2.5;   // 新卡片初始难度因子
  var DAY_MS = 24 * 60 * 60 * 1000;

  // UI 四档评分 → SM-2 质量分 q 的固定映射
  var GRADES = [
    { value: 1, q: 1, label: '完全不会', hint: '重置，1 天后重来' },
    { value: 2, q: 3, label: '有点印象', hint: '勉强通过' },
    { value: 3, q: 4, label: '熟悉，反应慢', hint: '通过' },
    { value: 4, q: 5, label: '熟练', hint: '轻松通过' }
  ];

  /* ---------------------------- 日期工具 ---------------------------- */

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  /** 本地时区日期 → YYYY-MM-DD */
  function toDateStr(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  /** YYYY-MM-DD + n 天 → YYYY-MM-DD（按本地日历计算，避开时区偏移） */
  function addDays(dateStr, n) {
    var parts = String(dateStr || toDateStr(new Date())).split('-').map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2]);
    dt.setDate(dt.getDate() + n);
    return toDateStr(dt);
  }

  /** 两个日期字符串相隔的天数（b - a） */
  function daysBetween(a, b) {
    var pa = String(a).split('-').map(Number);
    var pb = String(b).split('-').map(Number);
    var da = Date.UTC(pa[0], pa[1] - 1, pa[2]);
    var db = Date.UTC(pb[0], pb[1] - 1, pb[2]);
    return Math.round((db - da) / DAY_MS);
  }

  /* ---------------------------- 卡片状态 ---------------------------- */

  /** 生成一张全新的 SM-2 卡片 */
  function newCard(today) {
    return {
      reps: 0,
      ef: INITIAL_EF,
      interval: 0,
      due: today || toDateStr(new Date()),
      lapses: 0,
      lastGrade: null,
      lastReviewed: null,
      firstSeen: null
    };
  }

  /** 四档 UI 评分 → SM-2 质量分 q */
  function qualityFromGrade(grade) {
    for (var i = 0; i < GRADES.length; i++) {
      if (GRADES[i].value === Number(grade)) return GRADES[i].q;
    }
    return 1;
  }

  /* ---------------------------- 核心算法 ---------------------------- */

  /**
   * 执行一次 SM-2 复习，返回新卡片对象（不修改入参）。
   *
   * @param {object} card   旧卡片状态（可为空，内部按新卡处理）
   * @param {number} q      质量分 0–5
   * @param {string} today  今天 YYYY-MM-DD
   * @returns {object}      新卡片状态
   */
  function review(card, q, today) {
    var prev = Object.assign(newCard(today), card || {});
    var quality = Math.max(0, Math.min(5, Number(q)));
    if (isNaN(quality)) quality = 0;

    var reps = Number(prev.reps) || 0;
    var interval = Number(prev.interval) || 0;
    var ef = typeof prev.ef === 'number' ? prev.ef : INITIAL_EF;

    // 1) 间隔计算（使用更新前的 EF，符合 SM-2 原文）
    if (quality >= 3) {
      if (reps === 0) {
        interval = 1;             // 第一次答对：1 天后
      } else if (reps === 1) {
        interval = 6;             // 第二次答对：6 天后
      } else {
        interval = Math.max(1, Math.round(interval * ef)); // 之后：I × EF
      }
      reps += 1;
    } else {
      reps = 0;                   // 答错：连续答对次数清零
      interval = 1;               // 且次日重新学习
    }

    // 2) EF 更新（无论对错都更新；下限 1.3）
    var nextEf = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (nextEf < MIN_EF) nextEf = MIN_EF;
    nextEf = Math.round(nextEf * 1000) / 1000;

    return {
      reps: reps,
      ef: nextEf,
      interval: interval,
      due: addDays(today, interval),
      lapses: (Number(prev.lapses) || 0) + (quality >= 3 ? 0 : 1),
      lastGrade: quality,
      lastReviewed: today,
      firstSeen: prev.firstSeen || today
    };
  }

  /**
   * 预览某个评分会得到的间隔（天），用于评分按钮上的提示。
   * 使用固定日期，仅返回 interval，不产生副作用。
   */
  function previewInterval(card, q) {
    return review(card, q, '2000-01-01').interval;
  }

  /* ---------------------------- 导出 ---------------------------- */

  var api = {
    MIN_EF: MIN_EF,
    INITIAL_EF: INITIAL_EF,
    GRADES: GRADES,
    newCard: newCard,
    qualityFromGrade: qualityFromGrade,
    review: review,
    previewInterval: previewInterval,
    addDays: addDays,
    toDateStr: toDateStr,
    daysBetween: daysBetween
  };

  global.SM2 = api;

  // 便于用 Node 做单元测试
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);

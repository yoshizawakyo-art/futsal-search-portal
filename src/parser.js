/**
 * 自然言語1行入力から Task の各フィールドを抽出する純粋関数モジュール。
 *
 * 例:
 *   "明日 牛乳買う #買い物 !!"
 *   → { title: "牛乳買う", dueDate: "YYYY-MM-DD", tags: ["買い物"], priority: "medium" }
 *
 * 抽出順:
 *   1. タグ `#xxx` をすべて抽出
 *   2. 末尾の `!` `!!` `!!!` を優先度に変換
 *   3. 文字列先頭の日付キーワード (今日/明日/来週月/M/D 等) を dueDate に変換
 *   4. 残りを title とする
 */

import { PRIORITY } from "./common/constants.js";

/**
 * 曜日名 → Date#getDay() の値（日=0, 月=1, ..., 土=6）。
 */
const WEEKDAY =
{
    "日": 0,
    "月": 1,
    "火": 2,
    "水": 3,
    "木": 4,
    "金": 5,
    "土": 6
};

/**
 * 自然言語入力を Task フィールドに分解する。
 * 何も抽出できない部分はデフォルト値（null / [] / null）とし、UI 側で既存値とマージする。
 *
 * @param {string} text ユーザーの生入力。
 * @param {Date} today 今日の日付（ローカル時刻）。テスト容易性のため引数化。
 * @returns {{title: string, dueDate: string|null, tags: string[], priority: string|null}} 解析結果。
 */
export function parseNaturalInput(text, today)
{
    let working = String(text || "");

    const tagResult = extractTags(working);
    working = tagResult.cleaned;

    const prioResult = extractTrailingPriority(working);
    working = prioResult.cleaned;

    const dateResult = extractLeadingDate(working, today);
    working = dateResult ? dateResult.cleaned : working;

    const title = working.replace(/\s+/g, " ").trim();

    return {
        title,
        dueDate: dateResult ? dateResult.date : null,
        tags: tagResult.tags,
        priority: prioResult.priority
    };
}

/**
 * `#xxx` 形式のタグを全て抽出する。同一タグが複数あれば重複排除。
 *
 * @param {string} text 入力文字列。
 * @returns {{tags: string[], cleaned: string}} 抽出後のタグ配列と、タグを除いた文字列。
 */
function extractTags(text)
{
    const matches = [...text.matchAll(/#([^\s#]+)/g)];
    if (matches.length === 0)
    {
        return { tags: [], cleaned: text };
    }
    const seen = new Set();
    const tags = [];
    for (const m of matches)
    {
        if (!seen.has(m[1]))
        {
            seen.add(m[1]);
            tags.push(m[1]);
        }
    }
    let cleaned = text;
    for (const m of matches)
    {
        cleaned = cleaned.replace(m[0], " ");
    }
    return { tags, cleaned };
}

/**
 * 末尾の `!` `!!` `!!!` を優先度に変換する。
 * 1個=低、2個=中、3個以上=高。文中の `!` は対象外。
 *
 * @param {string} text 入力文字列。
 * @returns {{priority: string|null, cleaned: string}} 抽出後の優先度と、感嘆符を除いた文字列。
 */
function extractTrailingPriority(text)
{
    const m = text.match(/(!{1,3})\s*$/);
    if (!m)
    {
        return { priority: null, cleaned: text };
    }
    const count = m[1].length;
    const priority = count >= 3 ? PRIORITY.HIGH
        : count === 2 ? PRIORITY.MEDIUM
        : PRIORITY.LOW;
    const cleaned = text.slice(0, m.index) + text.slice(m.index + m[0].length);
    return { priority, cleaned };
}

/**
 * 文字列先頭にある日付キーワードを dueDate (YYYY-MM-DD) に変換する。
 * 「明日のミーティング」のように間に他の文字を挟んだ場合は誤抽出を避けるため対象外。
 *
 * @param {string} text 入力文字列。
 * @param {Date} today 今日の日付（ローカル時刻）。
 * @returns {{date: string, cleaned: string}|null} マッチすれば抽出結果、なければ null。
 */
function extractLeadingDate(text, today)
{
    const trimmed = text.trimStart();
    const leadingSpaceLen = text.length - trimmed.length;

    // 日付キーワードは末尾が空白か文字列終端のときだけ採用する。
    // これで「明日のミーティング」「来週末」などの誤抽出を防ぐ。
    const patterns =
    [
        {
            regex: /^(\d{4})-(\d{1,2})-(\d{1,2})(?=\s|$)/,
            toDate: function(m) { return formatYMD(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)); }
        },
        {
            regex: /^(\d{1,2})\/(\d{1,2})(?=\s|$)/,
            toDate: function(m) { return monthDayToYMD(parseInt(m[1], 10), parseInt(m[2], 10), today); }
        },
        {
            regex: /^来週([日月火水木金土])曜?(?=\s|$)/,
            toDate: function(m) { return addDaysYMD(today, daysToNextWeekWeekday(today, WEEKDAY[m[1]])); }
        },
        {
            regex: /^来週(?=\s|$)/,
            toDate: function() { return addDaysYMD(today, 7); }
        },
        {
            regex: /^今週(中|末)(?=\s|$)/,
            toDate: function() { return addDaysYMD(today, daysToEndOfWeek(today)); }
        },
        {
            regex: /^明後日(?=\s|$)/,
            toDate: function() { return addDaysYMD(today, 2); }
        },
        {
            regex: /^明日(?=\s|$)/,
            toDate: function() { return addDaysYMD(today, 1); }
        },
        {
            regex: /^今日(?=\s|$)/,
            toDate: function() { return addDaysYMD(today, 0); }
        }
    ];

    for (const p of patterns)
    {
        const m = trimmed.match(p.regex);
        if (m)
        {
            const consumeLen = leadingSpaceLen + m[0].length;
            return {
                date: p.toDate(m),
                cleaned: text.slice(consumeLen)
            };
        }
    }
    return null;
}

/**
 * Y/M/D を "YYYY-MM-DD" 形式の文字列に整形する。
 *
 * @param {number} year 西暦年。
 * @param {number} month 月（1-12）。
 * @param {number} day 日（1-31）。
 * @returns {string} "YYYY-MM-DD" 形式の文字列。
 */
function formatYMD(year, month, day)
{
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
}

/**
 * Date オブジェクトをローカルタイムの "YYYY-MM-DD" 文字列に変換する。
 *
 * @param {Date} date 対象の Date。
 * @returns {string} "YYYY-MM-DD" 形式。
 */
function dateToYMD(date)
{
    return formatYMD(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * 今日から n 日後の "YYYY-MM-DD" 文字列を返す。
 *
 * @param {Date} today 起点の日付。
 * @param {number} n 加算する日数。
 * @returns {string} "YYYY-MM-DD"。
 */
function addDaysYMD(today, n)
{
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    d.setDate(d.getDate() + n);
    return dateToYMD(d);
}

/**
 * "M/D" を当年として解釈し、過去になる場合は翌年に繰り上げる。
 *
 * @param {number} month 月。
 * @param {number} day 日。
 * @param {Date} today 今日の日付。
 * @returns {string} "YYYY-MM-DD"。
 */
function monthDayToYMD(month, day, today)
{
    let year = today.getFullYear();
    const candidate = new Date(year, month - 1, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (candidate < todayStart)
    {
        year++;
    }
    return formatYMD(year, month, day);
}

/**
 * 「来週X曜」が今日から何日後かを返す。
 * 「来週」は「次の月曜から始まる週」と定義する。
 *
 * @param {Date} today 今日の日付。
 * @param {number} targetDow 対象曜日（0=日, 1=月, ..., 6=土）。
 * @returns {number} 今日から対象日までの日数。
 */
function daysToNextWeekWeekday(today, targetDow)
{
    const todayDow = today.getDay();
    const daysToNextMonday = ((1 - todayDow + 7) % 7) || 7;
    const offsetFromMonday = (targetDow - 1 + 7) % 7;
    return daysToNextMonday + offsetFromMonday;
}

/**
 * 今週末（直近の日曜）までの日数を返す。今日が日曜なら 0。
 *
 * @param {Date} today 今日の日付。
 * @returns {number} 今日から日曜までの日数。
 */
function daysToEndOfWeek(today)
{
    return (7 - today.getDay()) % 7;
}

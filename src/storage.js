/**
 * localStorage 読み書きをラップするモジュール。
 * I/O 失敗時でもアプリが起動できるよう、例外を握って空配列にフォールバックする。
 */

import { STORAGE_KEY } from "./common/constants.js";

/**
 * localStorage から Task 一覧を読み込む。
 * 保存値が壊れている場合は警告ログを出して空配列を返す。
 *
 * @returns {Array<object>} Task 配列。未保存時・パース失敗時は空配列。
 */
export function loadTasks()
{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null)
    {
        return [];
    }
    try
    {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
        {
            console.warn("[storage] 保存値が配列ではないため空配列を返します", parsed);
            return [];
        }
        return parsed;
    }
    catch (error)
    {
        console.warn("[storage] JSON パースに失敗したため空配列を返します", error);
        return [];
    }
}

/**
 * Task 一覧を localStorage に保存する。
 * ストレージ容量超過等で失敗した場合は警告のみ（上位で復旧不能なため）。
 *
 * @param {Array<object>} tasks 保存する Task 配列。
 * @returns {void}
 */
export function saveTasks(tasks)
{
    try
    {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
    catch (error)
    {
        console.warn("[storage] 保存に失敗しました", error);
    }
}

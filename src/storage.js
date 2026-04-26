/**
 * localStorage 読み書きをラップするモジュール。
 * I/O 失敗時でもアプリが起動できるよう、例外を握って空配列にフォールバックする。
 */

import { STORAGE_KEY, STORAGE_KEY_V1 } from "./common/constants.js";

/**
 * localStorage から Task 一覧を読み込む。
 * v2 → v1 の順に試し、v1 しか無ければマイグレーションして v2 に保存する。
 * 保存値が壊れている場合は警告ログを出して空配列を返す。
 *
 * @returns {Array<object>} Task 配列。未保存時・パース失敗時は空配列。
 */
export function loadTasks()
{
    const v2 = readArray(STORAGE_KEY);
    if (v2 !== null)
    {
        return v2;
    }
    const v1 = readArray(STORAGE_KEY_V1);
    if (v1 !== null)
    {
        const migrated = migrateV1ToV2(v1);
        saveTasks(migrated);
        return migrated;
    }
    return [];
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

/**
 * 指定キーから配列を読み出す。未保存・壊れたデータは null を返す。
 *
 * @param {string} key localStorage キー。
 * @returns {Array<object>|null} 配列。未保存・パース失敗時は null。
 */
function readArray(key)
{
    const raw = localStorage.getItem(key);
    if (raw === null)
    {
        return null;
    }
    try
    {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
        {
            console.warn(`[storage] ${key} が配列ではないため無視します`, parsed);
            return null;
        }
        return parsed;
    }
    catch (error)
    {
        console.warn(`[storage] ${key} の JSON パースに失敗したため無視します`, error);
        return null;
    }
}

/**
 * v1 形式の Task 配列に completedAt を補完して v2 形式へ変換する。
 * v1 のオリジナルデータは消さない（ロールバック保険）。
 *
 * @param {Array<object>} tasks v1 形式の Task 配列。
 * @returns {Array<object>} v2 形式の Task 配列。
 */
function migrateV1ToV2(tasks)
{
    return tasks.map(function attachCompletedAt(task)
    {
        const completedAt = task.completed ? (task.updatedAt || null) : null;
        return { ...task, completedAt };
    });
}

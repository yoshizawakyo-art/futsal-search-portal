/**
 * Task の CRUD を純粋関数で提供するモジュール。
 * 入力配列を破壊しない（常に新しい配列を返す）。
 */

import
{
    PRIORITY,
    TAG_SEPARATOR,
    MAX_TITLE_LENGTH
} from "./common/constants.js";

/**
 * 新しい Task オブジェクトを生成する。
 * 入力のバリデーションはここでは軽く行い、詳しくは UI 層で行う。
 *
 * @param {{title: string, dueDate?: string|null, priority?: string, tags?: string[]}} input Task 入力値。
 * @returns {object} 生成された Task。
 * @throws {Error} タイトル未入力または長すぎる場合。
 */
export function createTask(input)
{
    const title = (input.title || "").trim();
    if (title.length === 0)
    {
        throw new Error("タイトルを入力してください。");
    }
    if (title.length > MAX_TITLE_LENGTH)
    {
        throw new Error(`タイトルは ${MAX_TITLE_LENGTH} 文字以内で入力してください。`);
    }
    const now = new Date().toISOString();
    return {
        id: crypto.randomUUID(),
        title,
        dueDate: input.dueDate || null,
        priority: input.priority || PRIORITY.MEDIUM,
        tags: Array.isArray(input.tags) ? input.tags : [],
        completed: false,
        createdAt: now,
        updatedAt: now
    };
}

/**
 * Task を部分更新して新しい配列を返す。
 * 対象 id が存在しない場合は元と同じ内容の配列を返す。
 *
 * @param {Array<object>} tasks 現在の Task 配列。
 * @param {string} id 更新対象の Task id。
 * @param {object} patch 上書きする部分フィールド。
 * @returns {Array<object>} 更新後の新しい配列。
 */
export function updateTask(tasks, id, patch)
{
    return tasks.map(function mapTaskToUpdated(task)
    {
        if (task.id !== id)
        {
            return task;
        }
        return {
            ...task,
            ...patch,
            id: task.id,
            createdAt: task.createdAt,
            updatedAt: new Date().toISOString()
        };
    });
}

/**
 * Task の completed を反転させる。
 *
 * @param {Array<object>} tasks 現在の Task 配列。
 * @param {string} id 対象 Task id。
 * @returns {Array<object>} 更新後の新しい配列。
 */
export function toggleComplete(tasks, id)
{
    return tasks.map(function mapTaskToToggled(task)
    {
        if (task.id !== id)
        {
            return task;
        }
        return {
            ...task,
            completed: !task.completed,
            updatedAt: new Date().toISOString()
        };
    });
}

/**
 * Task を削除した新しい配列を返す。
 *
 * @param {Array<object>} tasks 現在の Task 配列。
 * @param {string} id 削除対象の Task id。
 * @returns {Array<object>} 削除後の新しい配列。
 */
export function deleteTask(tasks, id)
{
    return tasks.filter(function keepNonMatchingTask(task)
    {
        return task.id !== id;
    });
}

/**
 * カンマ区切り文字列をタグ配列に変換する。
 * 空要素と前後空白は除去する。
 *
 * @param {string} raw ユーザー入力文字列。
 * @returns {string[]} タグ配列。空要素無し。
 */
export function parseTags(raw)
{
    if (!raw)
    {
        return [];
    }
    return raw
        .split(TAG_SEPARATOR)
        .map(function trimTag(tag)
        {
            return tag.trim();
        })
        .filter(function dropEmptyTag(tag)
        {
            return tag.length > 0;
        });
}

/**
 * Task 配列に対する検索・絞り込み・ソートを純粋関数で提供するモジュール。
 */

import
{
    STATUS_FILTER,
    PRIORITY_ORDER,
    DUE_DATE_UNSET_SORT_VALUE
} from "./common/constants.js";

/**
 * 検索クエリとステータスで Task をフィルタする。
 *
 * @param {Array<object>} tasks 元の Task 配列。
 * @param {{query?: string, status?: string}} criteria クエリとステータス。
 *   query はタイトル / タグに対する部分一致（大文字小文字無視）。
 *   status は STATUS_FILTER の値。
 * @returns {Array<object>} フィルタ結果の新しい配列。
 */
export function applyFilters(tasks, criteria)
{
    const query = (criteria.query || "").trim().toLowerCase();
    const status = criteria.status || STATUS_FILTER.ALL;

    return tasks.filter(function keepMatchingTask(task)
    {
        if (!matchesStatus(task, status))
        {
            return false;
        }
        if (query.length === 0)
        {
            return true;
        }
        return matchesQuery(task, query);
    });
}

/**
 * Task 配列を表示順にソートする。
 * 未完了 → 完了の順。その後、期限昇順（null は末尾）、さらに優先度 高 → 中 → 低。
 *
 * @param {Array<object>} tasks 元の Task 配列。
 * @returns {Array<object>} ソートされた新しい配列。
 */
export function sortTasks(tasks)
{
    const copy = tasks.slice();
    copy.sort(compareTasks);
    return copy;
}

/**
 * ステータスフィルタが Task にマッチするか判定する。
 *
 * @param {object} task 判定対象の Task。
 * @param {string} status STATUS_FILTER の値。
 * @returns {boolean} マッチすれば true。
 */
function matchesStatus(task, status)
{
    if (status === STATUS_FILTER.ALL)
    {
        return true;
    }
    if (status === STATUS_FILTER.ACTIVE)
    {
        return !task.completed;
    }
    if (status === STATUS_FILTER.COMPLETED)
    {
        return task.completed;
    }
    return true;
}

/**
 * 検索クエリが Task のタイトル / タグに部分一致するか判定する。
 *
 * @param {object} task 判定対象の Task。
 * @param {string} lowerQuery 小文字化済みクエリ。
 * @returns {boolean} いずれかにマッチすれば true。
 */
function matchesQuery(task, lowerQuery)
{
    if (task.title.toLowerCase().includes(lowerQuery))
    {
        return true;
    }
    return task.tags.some(function tagIncludesQuery(tag)
    {
        return tag.toLowerCase().includes(lowerQuery);
    });
}

/**
 * 2 つの Task を表示順で比較する比較関数。
 *
 * @param {object} a 左辺の Task。
 * @param {object} b 右辺の Task。
 * @returns {number} Array.sort の比較値。
 */
function compareTasks(a, b)
{
    if (a.completed !== b.completed)
    {
        return a.completed ? 1 : -1;
    }
    const dueA = a.dueDate || DUE_DATE_UNSET_SORT_VALUE;
    const dueB = b.dueDate || DUE_DATE_UNSET_SORT_VALUE;
    if (dueA !== dueB)
    {
        return dueA < dueB ? -1 : 1;
    }
    const prioA = PRIORITY_ORDER[a.priority] ?? PRIORITY_ORDER.medium;
    const prioB = PRIORITY_ORDER[b.priority] ?? PRIORITY_ORDER.medium;
    if (prioA !== prioB)
    {
        return prioA - prioB;
    }
    return a.createdAt < b.createdAt ? -1 : 1;
}

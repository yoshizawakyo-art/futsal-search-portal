/**
 * 「今これモード」用のタスク推薦ロジック（純粋関数）。
 *
 * スコアリング方針:
 *   - 期限切れタスクは強制最優先（+100 以上）
 *   - 期日が近いほど高得点
 *   - 優先度が高いほど高得点
 *   - 同点は createdAt が古いものを優先（先に書いたものから着手する手帳の流儀）
 */

import { PRIORITY } from "./common/constants.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const PRIORITY_SCORE =
{
    [PRIORITY.HIGH]: 30,
    [PRIORITY.MEDIUM]: 15,
    [PRIORITY.LOW]: 5
};

/**
 * 未完了タスクの中から「いま取り組むべき1件」を返す。
 *
 * @param {Array<object>} tasks Task 配列。
 * @param {Date} today 今日の日付（ローカル時刻）。
 * @returns {object|null} 推薦タスク。候補が無ければ null。
 */
export function recommendNext(tasks, today)
{
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let bestTask = null;
    let bestScore = -Infinity;

    for (const task of tasks)
    {
        if (task.completed)
        {
            continue;
        }
        const score = scoreTask(task, todayStart);
        if (score > bestScore)
        {
            bestScore = score;
            bestTask = task;
            continue;
        }
        if (score === bestScore && bestTask && task.createdAt < bestTask.createdAt)
        {
            bestTask = task;
        }
    }
    return bestTask;
}

/**
 * 1タスクのスコアを計算する。
 *
 * @param {object} task 対象タスク。
 * @param {Date} todayStart 今日の00:00（ローカル時刻）の Date。
 * @returns {number} スコア（高いほど推薦）。
 */
function scoreTask(task, todayStart)
{
    let score = PRIORITY_SCORE[task.priority] ?? PRIORITY_SCORE[PRIORITY.MEDIUM];

    if (task.dueDate)
    {
        const due = new Date(task.dueDate + "T00:00:00");
        const daysUntil = Math.round((due - todayStart) / DAY_MS);

        if (daysUntil < 0)
        {
            score += 100 + Math.min(50, Math.abs(daysUntil) * 5);
        }
        else if (daysUntil <= 1)
        {
            score += 50;
        }
        else if (daysUntil <= 3)
        {
            score += 30;
        }
        else if (daysUntil <= 7)
        {
            score += 15;
        }
    }

    return score;
}

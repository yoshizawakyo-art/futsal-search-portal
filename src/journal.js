/**
 * 達成ジャーナル用のデータ集計ロジック（純粋関数）。
 *
 * 完了タスクを `completedAt` 基準で日付ごとに束ね、ヒートマップ用のセル配列も提供する。
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 完了タスクを完了日（ローカルタイム）でグループ化する。
 * 新しい日が先頭。limitDays を超える古い日は切り捨てる。
 *
 * @param {Array<object>} tasks Task 配列。
 * @param {Date} today 今日の日付。
 * @param {number} limitDays 集計対象の日数（既定 30 日）。
 * @returns {Array<{date: string, tasks: Array<object>}>} 日付ごとのグループ配列。
 */
export function groupByCompletionDate(tasks, today, limitDays = 30)
{
    const todayStart = startOfDay(today);
    const earliestStart = new Date(todayStart);
    earliestStart.setDate(earliestStart.getDate() - (limitDays - 1));

    const buckets = new Map();
    for (const task of tasks)
    {
        if (!task.completed || !task.completedAt)
        {
            continue;
        }
        const completedAt = new Date(task.completedAt);
        if (Number.isNaN(completedAt.getTime()))
        {
            continue;
        }
        if (completedAt < earliestStart)
        {
            continue;
        }
        const key = toYMD(completedAt);
        if (!buckets.has(key))
        {
            buckets.set(key, []);
        }
        buckets.get(key).push(task);
    }

    const groups = [];
    for (const [date, list] of buckets.entries())
    {
        const sorted = list.slice().sort(function compareByCompletedAt(a, b)
        {
            return a.completedAt < b.completedAt ? 1 : -1;
        });
        groups.push({ date, tasks: sorted });
    }
    groups.sort(function compareByDateDesc(a, b)
    {
        return a.date < b.date ? 1 : -1;
    });
    return groups;
}

/**
 * 直近 N 週間のヒートマップ用セル配列を返す。
 * 各セルは1日ぶんの完了数を持つ。配列は古い日から新しい日の順、長さは weeks * 7。
 *
 * @param {Array<object>} tasks Task 配列。
 * @param {Date} today 今日の日付。
 * @param {number} weeks 集計対象の週数（既定 4）。
 * @returns {Array<{date: string, count: number, weekday: number, isToday: boolean}>} セル配列。
 */
export function buildMonthlyHeatmap(tasks, today, weeks = 4)
{
    const todayStart = startOfDay(today);
    const totalDays = weeks * 7;
    const start = new Date(todayStart);
    start.setDate(start.getDate() - (totalDays - 1));

    const counts = new Map();
    for (const task of tasks)
    {
        if (!task.completed || !task.completedAt)
        {
            continue;
        }
        const completedAt = new Date(task.completedAt);
        if (Number.isNaN(completedAt.getTime()))
        {
            continue;
        }
        if (completedAt < start || completedAt > endOfDay(today))
        {
            continue;
        }
        const key = toYMD(completedAt);
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    const cells = [];
    const cursor = new Date(start);
    const todayKey = toYMD(today);
    for (let i = 0; i < totalDays; i++)
    {
        const key = toYMD(cursor);
        cells.push({
            date: key,
            count: counts.get(key) || 0,
            weekday: cursor.getDay(),
            isToday: key === todayKey
        });
        cursor.setDate(cursor.getDate() + 1);
    }
    return cells;
}

/**
 * Date をローカルタイムの "YYYY-MM-DD" 文字列に整形する。
 *
 * @param {Date} date 対象の Date。
 * @returns {string} "YYYY-MM-DD"。
 */
function toYMD(date)
{
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * 引数の日付の 00:00 を表す Date を返す（ローカルタイム）。
 *
 * @param {Date} date 元の Date。
 * @returns {Date} 同じ日の 00:00。
 */
function startOfDay(date)
{
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * 引数の日付の 23:59:59.999 を表す Date を返す（ローカルタイム）。
 *
 * @param {Date} date 元の Date。
 * @returns {Date} 同じ日の終わり。
 */
function endOfDay(date)
{
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

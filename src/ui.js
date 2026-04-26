/**
 * DOM 生成・更新を担うモジュール。
 * ここだけが document を触る責務を持つ。純粋関数は tasks.js / filters.js 側。
 */

import
{
    PRIORITY,
    PRIORITY_LABEL,
    MESSAGES,
    VIEW
} from "./common/constants.js";

/**
 * タグの色パターン。タグ名のハッシュから色を決定する。
 */
const TAG_COLORS = ["blue", "green", "pink", "orange", "purple"];

/**
 * 優先度に応じた星表示。
 */
const PRIORITY_STARS =
{
    [PRIORITY.HIGH]: "★★★",
    [PRIORITY.MEDIUM]: "★☆☆",
    [PRIORITY.LOW]: "☆☆☆"
};

/**
 * タグ名から色クラスを決定する（ハッシュベース）。
 *
 * @param {string} tagName タグ名。
 * @returns {string} 色クラス名（blue, green, pink, orange, purple）。
 */
function getTagColor(tagName)
{
    let hash = 0;
    for (let i = 0; i < tagName.length; i++)
    {
        hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

/**
 * 期限日をフォーマットする。
 *
 * @param {string} dueDate ISO形式の日付文字列。
 * @returns {{text: string, isOverdue: boolean}} 表示テキストと期限切れフラグ。
 */
function formatDueDate(dueDate)
{
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + "T00:00:00");
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
    {
        return { text: `${Math.abs(diffDays)}日前`, isOverdue: true };
    }
    if (diffDays === 0)
    {
        return { text: "今日", isOverdue: false };
    }
    if (diffDays === 1)
    {
        return { text: "明日", isOverdue: false };
    }
    if (diffDays <= 7)
    {
        return { text: `${diffDays}日後`, isOverdue: false };
    }

    const month = due.getMonth() + 1;
    const day = due.getDate();
    return { text: `${month}/${day}`, isOverdue: false };
}

/**
 * タスクリストを描画する。既存の子ノードは全て置き換える。
 *
 * @param {HTMLElement} container タスクリストのコンテナ要素。
 * @param {Array<object>} tasks 描画対象の Task 配列（フィルタ済み・ソート済み想定）。
 * @param {boolean} hasAny フィルタ前に Task が 1 件でも存在するか。空状態メッセージ切替用。
 * @param {{onToggle: Function, onDelete: Function, onEdit: Function}} handlers 各種イベントハンドラ。
 * @returns {void}
 */
export function renderList(container, tasks, hasAny, handlers)
{
    container.replaceChildren();
    if (tasks.length === 0)
    {
        container.appendChild(createEmptyState(hasAny));
        return;
    }
    for (const task of tasks)
    {
        container.appendChild(createTaskRow(task, handlers));
    }
}

/**
 * 空状態メッセージ要素を生成する。
 *
 * @param {boolean} hasAny フィルタ前に Task があるかどうか。
 * @returns {HTMLElement} 空状態を示す要素。
 */
function createEmptyState(hasAny)
{
    const wrapper = document.createElement("p");
    wrapper.className = "empty-state";
    wrapper.textContent = hasAny ? MESSAGES.EMPTY_FILTERED : MESSAGES.EMPTY_ALL;
    return wrapper;
}

/**
 * 1 件分のタスク行を生成する。
 *
 * @param {object} task 描画する Task。
 * @param {{onToggle: Function, onDelete: Function, onEdit: Function}} handlers イベントハンドラ。
 * @returns {HTMLElement} タスク行要素。
 */
function createTaskRow(task, handlers)
{
    const row = document.createElement("li");
    row.className = "task-row";
    row.dataset.taskId = task.id;
    if (task.completed)
    {
        row.classList.add("task-row--completed");
    }

    row.appendChild(createToggle(task, handlers.onToggle));
    row.appendChild(createMainArea(task));
    row.appendChild(createActions(task, handlers));
    return row;
}

/**
 * 完了トグル（チェックボックス）を生成する。
 *
 * @param {object} task 対象 Task。
 * @param {Function} onToggle 変更時のハンドラ。
 * @returns {HTMLElement} ラベル付きチェックボックス。
 */
function createToggle(task, onToggle)
{
    const label = document.createElement("label");
    label.className = "task-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", function onToggleChange()
    {
        onToggle(task.id);
    });
    label.appendChild(checkbox);
    return label;
}

/**
 * タイトル / 期限 / 優先度バッジ / タグを並べた中央エリアを生成する。
 *
 * @param {object} task 対象 Task。
 * @returns {HTMLElement} 中央エリア要素。
 */
function createMainArea(task)
{
    const main = document.createElement("div");
    main.className = "task-main";

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;
    main.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "task-meta";

    meta.appendChild(createPriorityStars(task.priority));

    for (const tag of task.tags)
    {
        meta.appendChild(createTagChip(tag));
    }

    if (task.dueDate)
    {
        meta.appendChild(createDueBadge(task.dueDate));
    }

    main.appendChild(meta);
    return main;
}

/**
 * 優先度を星で表示する。
 *
 * @param {string} priority PRIORITY の値。
 * @returns {HTMLElement} 星バッジ要素。
 */
function createPriorityStars(priority)
{
    const badge = document.createElement("span");
    const safePriority = Object.values(PRIORITY).includes(priority) ? priority : PRIORITY.MEDIUM;
    badge.className = "task-priority";
    badge.textContent = PRIORITY_STARS[safePriority];
    badge.title = `優先度: ${safePriority === PRIORITY.HIGH ? "高" : safePriority === PRIORITY.MEDIUM ? "中" : "低"}`;
    return badge;
}

/**
 * タグチップを生成する（カラフル）。
 *
 * @param {string} tagName タグ名。
 * @returns {HTMLElement} タグチップ要素。
 */
function createTagChip(tagName)
{
    const chip = document.createElement("span");
    const color = getTagColor(tagName);
    chip.className = `task-tag task-tag--${color}`;
    chip.textContent = tagName;
    return chip;
}

/**
 * 期限バッジを生成する。
 *
 * @param {string} dueDate ISO形式の日付文字列。
 * @returns {HTMLElement} 期限バッジ要素。
 */
function createDueBadge(dueDate)
{
    const { text, isOverdue } = formatDueDate(dueDate);
    const badge = document.createElement("span");
    badge.className = "task-due";
    if (isOverdue)
    {
        badge.classList.add("task-due--overdue");
    }
    badge.textContent = text;
    return badge;
}

/**
 * 編集・削除ボタンを並べたアクション領域を生成する。
 *
 * @param {object} task 対象 Task。
 * @param {{onDelete: Function, onEdit: Function}} handlers 削除・編集ハンドラ。
 * @returns {HTMLElement} アクション領域要素。
 */
function createActions(task, handlers)
{
    const wrapper = document.createElement("div");
    wrapper.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "task-action task-action--edit";
    editBtn.textContent = "編集";
    editBtn.addEventListener("click", function onEditClick()
    {
        handlers.onEdit(task.id);
    });
    wrapper.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "task-action task-action--delete";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", function onDeleteClick()
    {
        handlers.onDelete(task.id);
    });
    wrapper.appendChild(deleteBtn);

    return wrapper;
}

/**
 * フォーム要素から入力値を取り出し、plain object にして返す。
 *
 * @param {HTMLFormElement} form 入力フォーム。
 * @returns {{title: string, dueDate: string|null, priority: string, tags: string}} 生の入力値。
 */
export function readFormValues(form)
{
    const data = new FormData(form);
    return {
        title: String(data.get("title") || ""),
        dueDate: String(data.get("dueDate") || "") || null,
        priority: String(data.get("priority") || PRIORITY.MEDIUM),
        tags: String(data.get("tags") || "")
    };
}

/**
 * フォームに Task の現在値を書き戻す（編集開始時に使用）。
 *
 * @param {HTMLFormElement} form 入力フォーム。
 * @param {object} task 反映する Task。
 * @returns {void}
 */
export function setFormValues(form, task)
{
    form.elements.namedItem("title").value = task.title;
    form.elements.namedItem("dueDate").value = task.dueDate || "";
    form.elements.namedItem("priority").value = task.priority;
    form.elements.namedItem("tags").value = task.tags.join(", ");

    updatePriorityButtons(task.priority);
    openFormDetails();
}

/**
 * フォームを初期状態（空）に戻す。
 *
 * @param {HTMLFormElement} form 対象フォーム。
 * @returns {void}
 */
export function resetForm(form)
{
    form.reset();
    form.elements.namedItem("priority").value = PRIORITY.MEDIUM;
    updatePriorityButtons(PRIORITY.MEDIUM);
    closeFormDetails();
}

/**
 * フォームのサブミットボタン表示を「追加」と「更新」で切り替える。
 *
 * @param {HTMLElement} submitButton 対象ボタン。
 * @param {boolean} isEditing 編集中なら true。
 * @returns {void}
 */
export function setSubmitLabel(submitButton, isEditing)
{
    submitButton.textContent = isEditing ? "更新する" : "手帳に書き込む";
}

/**
 * キャンセルボタンの表示 / 非表示を切り替える。
 *
 * @param {HTMLElement} cancelButton 対象ボタン。
 * @param {boolean} visible 表示するか。
 * @returns {void}
 */
export function setCancelVisible(cancelButton, visible)
{
    cancelButton.hidden = !visible;
}

/**
 * 優先度ボタンのアクティブ状態を更新する。
 *
 * @param {string} priority 選択された優先度。
 * @returns {void}
 */
export function updatePriorityButtons(priority)
{
    const buttons = document.querySelectorAll(".star-btn");
    buttons.forEach(function(btn)
    {
        btn.classList.toggle("star-btn--active", btn.dataset.priority === priority);
    });
}

/**
 * フォーム詳細部分を開く。
 *
 * @returns {void}
 */
export function openFormDetails()
{
    const details = document.getElementById("form-details");
    if (details)
    {
        details.classList.add("is-open");
    }
}

/**
 * フォーム詳細部分を閉じる。
 *
 * @returns {void}
 */
export function closeFormDetails()
{
    const details = document.getElementById("form-details");
    if (details)
    {
        details.classList.remove("is-open");
    }
}

/**
 * サイドバーの進捗表示を更新する。
 *
 * @param {number} completed 完了タスク数。
 * @param {number} total 全タスク数。
 * @returns {void}
 */
export function updateProgress(completed, total)
{
    const completedEl = document.getElementById("completed-count");
    const totalEl = document.getElementById("total-count");
    const fillEl = document.getElementById("progress-fill");
    const messageEl = document.getElementById("progress-message");

    if (completedEl) completedEl.textContent = completed;
    if (totalEl) totalEl.textContent = total;

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    if (fillEl) fillEl.style.width = `${percent}%`;

    if (messageEl)
    {
        if (total === 0)
        {
            messageEl.textContent = "タスクを追加しよう!";
        }
        else if (completed === total)
        {
            messageEl.textContent = "All done! Great job!";
        }
        else if (percent >= 70)
        {
            messageEl.textContent = "Almost there!";
        }
        else if (percent >= 30)
        {
            messageEl.textContent = "keep going!";
        }
        else
        {
            messageEl.textContent = "Let's get started!";
        }
    }

    const todayDoneEl = document.getElementById("today-done");
    const todayTotalEl = document.getElementById("today-total");
    if (todayDoneEl) todayDoneEl.textContent = completed;
    if (todayTotalEl) todayTotalEl.textContent = total;
}

/**
 * ヘッダーの日付表示を更新する。
 *
 * @returns {void}
 */
export function updateDateDisplay()
{
    const now = new Date();
    const weekdays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

    const weekdayEl = document.getElementById("weekday-text");
    const monthEl = document.getElementById("month-text");
    const dayEl = document.getElementById("day-text");
    const yearEl = document.getElementById("year-text");

    if (weekdayEl) weekdayEl.textContent = weekdays[now.getDay()];
    if (monthEl) monthEl.textContent = `${now.getMonth() + 1}月`;
    if (dayEl) dayEl.textContent = now.getDate();
    if (yearEl) yearEl.textContent = `'${String(now.getFullYear()).slice(-2)}`;
}

/**
 * フィルターチップのアクティブ状態を更新する。
 *
 * @param {string} status 選択されたステータス。
 * @returns {void}
 */
export function updateFilterChips(status)
{
    const chips = document.querySelectorAll(".filter-chip");
    chips.forEach(function(chip)
    {
        chip.classList.toggle("filter-chip--active", chip.dataset.status === status);
    });
}

/**
 * 完了時のFINISHED!演出を表示する。
 *
 * @param {string} taskId 完了したタスクのID。
 * @returns {void}
 */
export function showCompletionEffect(taskId)
{
    const row = document.querySelector(`[data-task-id="${taskId}"]`);
    if (row && row.classList.contains("task-row--completed"))
    {
        row.classList.add("just-completed");
        setTimeout(function()
        {
            row.classList.remove("just-completed");
        }, 1500);
    }
}

/**
 * メインビューを切り替える（リスト / 今これ / 達成）。
 * 各セクションの hidden 属性で表示制御し、サイドバーのアクティブ状態も更新する。
 *
 * @param {string} view VIEW 定数の値。
 * @returns {void}
 */
export function showView(view)
{
    const filterSection = document.querySelector(".task-filter-section");
    const listSection = document.getElementById("task-list-section");
    const nowSection = document.getElementById("now-mode-section");
    const journalSection = document.getElementById("journal-section");

    const isList = view === VIEW.TODAY || view === VIEW.ALL || view === VIEW.COMPLETED;
    if (filterSection) filterSection.hidden = !isList;
    if (listSection) listSection.hidden = !isList;
    if (nowSection) nowSection.hidden = view !== VIEW.NOW;
    if (journalSection) journalSection.hidden = view !== VIEW.JOURNAL;

    document.querySelectorAll(".nav-item").forEach(function(item)
    {
        item.classList.toggle("nav-item--active", item.dataset.view === view);
    });
}

/**
 * 自然言語パース結果のチッププレビューを描画する。
 * 抽出が無ければ領域ごと隠す。
 *
 * @param {HTMLElement} container プレビュー領域。
 * @param {{title: string, dueDate: string|null, tags: string[], priority: string|null}} parsed パース結果。
 * @returns {void}
 */
export function renderInputPreview(container, parsed)
{
    container.replaceChildren();
    const hasAny = Boolean(parsed.dueDate) || parsed.tags.length > 0 || Boolean(parsed.priority);
    if (!hasAny)
    {
        container.hidden = true;
        return;
    }
    container.hidden = false;

    const label = document.createElement("span");
    label.className = "preview-label";
    label.textContent = "解析:";
    container.appendChild(label);

    if (parsed.dueDate)
    {
        const chip = document.createElement("span");
        chip.className = "preview-chip preview-chip--due";
        const formatted = formatDueDate(parsed.dueDate);
        chip.textContent = `期日: ${formatted.text} (${parsed.dueDate})`;
        container.appendChild(chip);
    }

    for (const tag of parsed.tags)
    {
        const chip = document.createElement("span");
        chip.className = "preview-chip preview-chip--tag";
        chip.textContent = `#${tag}`;
        container.appendChild(chip);
    }

    if (parsed.priority)
    {
        const chip = document.createElement("span");
        chip.className = "preview-chip preview-chip--priority";
        chip.textContent = `優先度: ${PRIORITY_LABEL[parsed.priority] || parsed.priority}`;
        container.appendChild(chip);
    }
}

/**
 * 「今これ」モードのカードを描画する。候補が無ければ空メッセージ。
 *
 * @param {HTMLElement} container 描画先。
 * @param {object|null} task 推薦されたタスク。
 * @param {{onComplete: Function, onSkip: Function, onEdit: Function}} handlers 各種ハンドラ。
 * @returns {void}
 */
export function renderNowMode(container, task, handlers)
{
    container.replaceChildren();
    if (!task)
    {
        const p = document.createElement("p");
        p.className = "now-empty";
        p.textContent = MESSAGES.NOW_EMPTY;
        container.appendChild(p);
        return;
    }

    const card = document.createElement("article");
    card.className = "now-card";
    card.dataset.taskId = task.id;

    const label = document.createElement("p");
    label.className = "now-card-label";
    label.textContent = "now this —";
    card.appendChild(label);

    const title = document.createElement("h3");
    title.className = "now-card-title";
    title.textContent = task.title;
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "now-card-meta";
    meta.appendChild(createPriorityStars(task.priority));
    for (const tag of task.tags)
    {
        meta.appendChild(createTagChip(tag));
    }
    if (task.dueDate)
    {
        meta.appendChild(createDueBadge(task.dueDate));
    }
    card.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "now-card-actions";

    const completeBtn = document.createElement("button");
    completeBtn.type = "button";
    completeBtn.className = "btn-primary";
    completeBtn.textContent = "✓ 完了する";
    completeBtn.addEventListener("click", function onCompleteClick()
    {
        handlers.onComplete(task.id);
    });
    actions.appendChild(completeBtn);

    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "btn-secondary";
    skipBtn.textContent = "次の候補へ →";
    skipBtn.addEventListener("click", function onSkipClick()
    {
        handlers.onSkip(task.id);
    });
    actions.appendChild(skipBtn);

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn-secondary";
    editBtn.textContent = "編集";
    editBtn.addEventListener("click", function onEditClick()
    {
        handlers.onEdit(task.id);
    });
    actions.appendChild(editBtn);

    card.appendChild(actions);
    container.appendChild(card);
}

/**
 * 達成ジャーナル（ヒートマップ + 日付別完了リスト）を描画する。
 *
 * @param {HTMLElement} container 描画先。
 * @param {Array<{date: string, tasks: Array<object>}>} groupedDays 日付グループ配列。
 * @param {Array<{date: string, count: number, weekday: number, isToday: boolean}>} heatmapCells ヒートマップ用セル。
 * @returns {void}
 */
export function renderJournal(container, groupedDays, heatmapCells)
{
    container.replaceChildren();

    const heatmapWrap = document.createElement("div");
    heatmapWrap.className = "journal-heatmap";

    const heatmapTitle = document.createElement("p");
    heatmapTitle.className = "journal-heatmap-title";
    heatmapTitle.textContent = "this month's stamps";
    heatmapWrap.appendChild(heatmapTitle);

    const grid = document.createElement("div");
    grid.className = "heatmap-grid";
    for (const cell of heatmapCells)
    {
        const div = document.createElement("div");
        div.className = "heatmap-cell";
        if (cell.count > 0) div.classList.add("heatmap-cell--has");
        if (cell.count >= 2) div.classList.add("heatmap-cell--has-2");
        if (cell.count >= 3) div.classList.add("heatmap-cell--has-3");
        if (cell.isToday) div.classList.add("heatmap-cell--today");
        div.title = `${cell.date}: ${cell.count}件完了`;
        if (cell.count > 0)
        {
            div.textContent = String(cell.count);
        }
        grid.appendChild(div);
    }
    heatmapWrap.appendChild(grid);

    const legend = document.createElement("p");
    legend.className = "heatmap-legend";
    legend.textContent = "数字 = その日の完了タスク数 / 点線枠 = 今日";
    heatmapWrap.appendChild(legend);

    container.appendChild(heatmapWrap);

    if (groupedDays.length === 0)
    {
        const p = document.createElement("p");
        p.className = "journal-empty";
        p.textContent = MESSAGES.JOURNAL_EMPTY;
        container.appendChild(p);
        return;
    }

    for (const group of groupedDays)
    {
        const wrap = document.createElement("section");
        wrap.className = "journal-day-group";

        const heading = document.createElement("h3");
        heading.className = "journal-day-heading";
        heading.textContent = formatJournalDate(group.date);
        wrap.appendChild(heading);

        const list = document.createElement("ul");
        list.className = "journal-day-list";
        for (const task of group.tasks)
        {
            const li = document.createElement("li");
            li.className = "journal-day-item";

            const stamp = document.createElement("span");
            stamp.className = "journal-stamp";
            stamp.textContent = "✓";
            li.appendChild(stamp);

            const title = document.createElement("span");
            title.className = "journal-day-title";
            title.textContent = task.title;
            li.appendChild(title);

            list.appendChild(li);
        }
        wrap.appendChild(list);
        container.appendChild(wrap);
    }
}

/**
 * ジャーナル用の日付見出し文字列を生成する。今日 / 昨日は名前で、それ以外は M/D (曜)。
 *
 * @param {string} ymd "YYYY-MM-DD" 形式。
 * @returns {string} 表示用文字列。
 */
function formatJournalDate(ymd)
{
    const parts = ymd.split("-").map(function(s) { return parseInt(s, 10); });
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

    const today = new Date();
    const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yYmd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    const md = `${parts[1]}/${parts[2]}`;
    const wd = weekdays[date.getDay()];
    if (ymd === todayYmd) return `今日 — ${md} (${wd})`;
    if (ymd === yYmd) return `昨日 — ${md} (${wd})`;
    return `${md} (${wd})`;
}

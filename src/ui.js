/**
 * DOM 生成・更新を担うモジュール。
 * ここだけが document を触る責務を持つ。純粋関数は tasks.js / filters.js 側。
 */

import
{
    PRIORITY,
    PRIORITY_LABEL,
    MESSAGES
} from "./common/constants.js";

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

    if (task.dueDate)
    {
        const due = document.createElement("span");
        due.className = "task-due";
        due.textContent = `期限: ${task.dueDate}`;
        meta.appendChild(due);
    }

    meta.appendChild(createPriorityBadge(task.priority));

    for (const tag of task.tags)
    {
        const chip = document.createElement("span");
        chip.className = "task-tag";
        chip.textContent = `#${tag}`;
        meta.appendChild(chip);
    }

    main.appendChild(meta);
    return main;
}

/**
 * 優先度バッジを生成する。
 *
 * @param {string} priority PRIORITY の値。
 * @returns {HTMLElement} バッジ要素。
 */
function createPriorityBadge(priority)
{
    const badge = document.createElement("span");
    const safePriority = Object.values(PRIORITY).includes(priority) ? priority : PRIORITY.MEDIUM;
    badge.className = `task-priority task-priority--${safePriority}`;
    badge.textContent = `優先度: ${PRIORITY_LABEL[safePriority]}`;
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
    submitButton.textContent = isEditing ? "更新" : "追加";
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

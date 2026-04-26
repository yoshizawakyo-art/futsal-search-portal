/**
 * エントリモジュール。state を保持し、ストレージ / ロジック / UI を結線する。
 */

import { loadTasks, saveTasks } from "./storage.js";
import
{
    createTask,
    updateTask,
    toggleComplete,
    deleteTask,
    parseTags
} from "./tasks.js";
import { applyFilters, sortTasks } from "./filters.js";
import
{
    renderList,
    readFormValues,
    setFormValues,
    resetForm,
    setSubmitLabel,
    setCancelVisible,
    updatePriorityButtons,
    openFormDetails,
    closeFormDetails,
    updateProgress,
    updateDateDisplay,
    updateFilterChips,
    showCompletionEffect
} from "./ui.js";
import
{
    STATUS_FILTER,
    MESSAGES,
    PRIORITY
} from "./common/constants.js";

/**
 * アプリ全体の可変状態。関数間で共有するためモジュールスコープに置く。
 * 外部からは触らせない（エクスポートしない）。
 */
const state =
{
    tasks: [],
    editingId: null,
    filters:
    {
        query: "",
        status: STATUS_FILTER.ACTIVE
    }
};

/**
 * アプリを起動する。初回レンダとイベント結線を行う。
 *
 * @returns {void}
 */
export function init()
{
    state.tasks = loadTasks();

    const form = document.getElementById("task-form");
    const list = document.getElementById("task-list");
    const searchInput = document.getElementById("search-input");
    const cancelBtn = document.getElementById("cancel-edit");
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorBox = document.getElementById("form-error");
    const titleInput = document.getElementById("title-input");

    updateDateDisplay();

    form.addEventListener("submit", function onSubmit(event)
    {
        event.preventDefault();
        handleSubmit(form, submitBtn, cancelBtn, errorBox);
        refresh(list);
    });

    cancelBtn.addEventListener("click", function onCancelEdit()
    {
        cancelEditing(form, submitBtn, cancelBtn, errorBox);
    });

    searchInput.addEventListener("input", function onSearchInput(event)
    {
        state.filters.query = event.target.value;
        refresh(list);
    });

    titleInput.addEventListener("focus", function onTitleFocus()
    {
        openFormDetails();
    });

    setupFilterChips(list);
    setupPriorityButtons(form);
    setupDueChips(form);
    setupNavigation(list);

    refresh(list);
}

/**
 * フィルターチップのイベント設定。
 *
 * @param {HTMLElement} list タスクリストコンテナ。
 * @returns {void}
 */
function setupFilterChips(list)
{
    const chips = document.querySelectorAll(".filter-chip");
    chips.forEach(function(chip)
    {
        chip.addEventListener("click", function onChipClick()
        {
            state.filters.status = chip.dataset.status;
            updateFilterChips(state.filters.status);
            refresh(list);
        });
    });
}

/**
 * 優先度ボタンのイベント設定。
 *
 * @param {HTMLFormElement} form フォーム要素。
 * @returns {void}
 */
function setupPriorityButtons(form)
{
    const buttons = document.querySelectorAll(".star-btn");
    const hiddenInput = document.getElementById("priority-select");

    buttons.forEach(function(btn)
    {
        btn.addEventListener("click", function onPriorityClick(event)
        {
            event.preventDefault();
            const priority = btn.dataset.priority;
            hiddenInput.value = priority;
            updatePriorityButtons(priority);
        });
    });
}

/**
 * 期限チップ（今日/明日）のイベント設定。
 *
 * @param {HTMLFormElement} form フォーム要素。
 * @returns {void}
 */
function setupDueChips(form)
{
    const chips = document.querySelectorAll(".due-chip");
    const dueInput = document.getElementById("due-input");

    chips.forEach(function(chip)
    {
        chip.addEventListener("click", function onDueChipClick(event)
        {
            event.preventDefault();
            const today = new Date();
            let targetDate = new Date();

            if (chip.dataset.due === "tomorrow")
            {
                targetDate.setDate(today.getDate() + 1);
            }

            const yyyy = targetDate.getFullYear();
            const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
            const dd = String(targetDate.getDate()).padStart(2, "0");
            dueInput.value = `${yyyy}-${mm}-${dd}`;

            chips.forEach(function(c)
            {
                c.classList.remove("due-chip--active");
            });
            chip.classList.add("due-chip--active");
        });
    });

    dueInput.addEventListener("change", function onDueDateChange()
    {
        chips.forEach(function(c)
        {
            c.classList.remove("due-chip--active");
        });
    });
}

/**
 * サイドバーナビゲーションのイベント設定。
 *
 * @param {HTMLElement} list タスクリストコンテナ。
 * @returns {void}
 */
function setupNavigation(list)
{
    const navItems = document.querySelectorAll(".nav-item");

    navItems.forEach(function(item)
    {
        item.addEventListener("click", function onNavClick()
        {
            navItems.forEach(function(nav)
            {
                nav.classList.remove("nav-item--active");
            });
            item.classList.add("nav-item--active");

            const view = item.dataset.view;
            if (view === "today")
            {
                state.filters.status = STATUS_FILTER.ACTIVE;
            }
            else if (view === "completed")
            {
                state.filters.status = STATUS_FILTER.COMPLETED;
            }
            else
            {
                state.filters.status = STATUS_FILTER.ALL;
            }

            updateFilterChips(state.filters.status);
            refresh(list);
        });
    });
}

/**
 * フォーム送信の処理。新規追加 or 更新を editingId に応じて分岐。
 *
 * @param {HTMLFormElement} form 対象フォーム。
 * @param {HTMLElement} submitBtn 送信ボタン。
 * @param {HTMLElement} cancelBtn キャンセルボタン。
 * @param {HTMLElement} errorBox バリデーションエラー表示領域。
 * @returns {void}
 */
function handleSubmit(form, submitBtn, cancelBtn, errorBox)
{
    const raw = readFormValues(form);
    errorBox.textContent = "";
    try
    {
        if (state.editingId === null)
        {
            state.tasks = state.tasks.concat(createTask({
                title: raw.title,
                dueDate: raw.dueDate,
                priority: raw.priority,
                tags: parseTags(raw.tags)
            }));
        }
        else
        {
            state.tasks = updateTask(state.tasks, state.editingId, {
                title: raw.title.trim(),
                dueDate: raw.dueDate,
                priority: raw.priority,
                tags: parseTags(raw.tags)
            });
            state.editingId = null;
            setCancelVisible(cancelBtn, false);
            setSubmitLabel(submitBtn, false);
        }
        persist();
        resetForm(form);
    }
    catch (error)
    {
        errorBox.textContent = error.message;
    }
}

/**
 * 編集モードに入る。対象 Task の値をフォームに流し込む。
 *
 * @param {string} id 編集対象の Task id。
 * @returns {void}
 */
function startEditing(id)
{
    const target = state.tasks.find(function findTaskById(task)
    {
        return task.id === id;
    });
    if (!target)
    {
        return;
    }
    const form = document.getElementById("task-form");
    const submitBtn = form.querySelector('button[type="submit"]');
    const cancelBtn = document.getElementById("cancel-edit");
    state.editingId = id;
    setFormValues(form, target);
    setSubmitLabel(submitBtn, true);
    setCancelVisible(cancelBtn, true);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * 編集モードを抜けてフォームを初期化する。
 *
 * @param {HTMLFormElement} form 対象フォーム。
 * @param {HTMLElement} submitBtn 送信ボタン。
 * @param {HTMLElement} cancelBtn キャンセルボタン。
 * @param {HTMLElement} errorBox エラー表示領域。
 * @returns {void}
 */
function cancelEditing(form, submitBtn, cancelBtn, errorBox)
{
    state.editingId = null;
    resetForm(form);
    setSubmitLabel(submitBtn, false);
    setCancelVisible(cancelBtn, false);
    errorBox.textContent = "";
}

/**
 * 指定 Task の完了状態を反転する。
 *
 * @param {string} id 対象 Task id。
 * @returns {void}
 */
function handleToggle(id)
{
    const taskBefore = state.tasks.find(function(t) { return t.id === id; });
    const wasCompleted = taskBefore ? taskBefore.completed : false;

    state.tasks = toggleComplete(state.tasks, id);
    persist();
    refresh(document.getElementById("task-list"));

    if (!wasCompleted)
    {
        showCompletionEffect(id);
    }
}

/**
 * 指定 Task を削除する（ユーザー確認あり）。
 *
 * @param {string} id 対象 Task id。
 * @returns {void}
 */
function handleDelete(id)
{
    if (!window.confirm(MESSAGES.CONFIRM_DELETE))
    {
        return;
    }
    state.tasks = deleteTask(state.tasks, id);
    if (state.editingId === id)
    {
        state.editingId = null;
        const form = document.getElementById("task-form");
        const submitBtn = form.querySelector('button[type="submit"]');
        const cancelBtn = document.getElementById("cancel-edit");
        resetForm(form);
        setSubmitLabel(submitBtn, false);
        setCancelVisible(cancelBtn, false);
    }
    persist();
    refresh(document.getElementById("task-list"));
}

/**
 * state.tasks を localStorage に保存する薄いラッパ。
 *
 * @returns {void}
 */
function persist()
{
    saveTasks(state.tasks);
}

/**
 * 現在の state に基づきタスクリストを再描画する。
 *
 * @param {HTMLElement} list タスクリストのコンテナ要素。
 * @returns {void}
 */
function refresh(list)
{
    const filtered = applyFilters(state.tasks, state.filters);
    const sorted = sortTasks(filtered);
    renderList(list, sorted, state.tasks.length > 0, {
        onToggle: handleToggle,
        onEdit: startEditing,
        onDelete: handleDelete
    });

    const completed = state.tasks.filter(function(t) { return t.completed; }).length;
    updateProgress(completed, state.tasks.length);
}

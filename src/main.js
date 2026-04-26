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
import { parseNaturalInput } from "./parser.js";
import { recommendNext } from "./recommend.js";
import { groupByCompletionDate, buildMonthlyHeatmap } from "./journal.js";
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
    showCompletionEffect,
    showView,
    renderInputPreview,
    renderNowMode,
    renderJournal
} from "./ui.js";
import
{
    STATUS_FILTER,
    VIEW,
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
    view: VIEW.TODAY,
    nowSkipped: new Set(),
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
    const previewEl = document.getElementById("input-preview");

    updateDateDisplay();

    form.addEventListener("submit", function onSubmit(event)
    {
        event.preventDefault();
        const succeeded = handleSubmit(form, submitBtn, cancelBtn, errorBox);
        if (succeeded)
        {
            renderInputPreview(previewEl, emptyParsed());
        }
        refresh(list);
    });

    cancelBtn.addEventListener("click", function onCancelEdit()
    {
        cancelEditing(form, submitBtn, cancelBtn, errorBox);
        renderInputPreview(previewEl, emptyParsed());
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

    titleInput.addEventListener("input", function onTitleInput()
    {
        const parsed = parseNaturalInput(titleInput.value, new Date());
        renderInputPreview(previewEl, parsed);
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
            const view = item.dataset.view;
            state.view = view;

            if (view === VIEW.TODAY)
            {
                state.filters.status = STATUS_FILTER.ACTIVE;
            }
            else if (view === VIEW.COMPLETED)
            {
                state.filters.status = STATUS_FILTER.COMPLETED;
            }
            else if (view === VIEW.ALL)
            {
                state.filters.status = STATUS_FILTER.ALL;
            }

            if (view === VIEW.NOW)
            {
                state.nowSkipped = new Set();
            }

            updateFilterChips(state.filters.status);
            refresh(list);
        });
    });
}

/**
 * フォーム送信の処理。新規追加 or 更新を editingId に応じて分岐。
 * 自然言語パース結果を form 値とマージして最終フィールドを決める。
 *
 * @param {HTMLFormElement} form 対象フォーム。
 * @param {HTMLElement} submitBtn 送信ボタン。
 * @param {HTMLElement} cancelBtn キャンセルボタン。
 * @param {HTMLElement} errorBox バリデーションエラー表示領域。
 * @returns {boolean} 送信が成功して form を reset したら true、エラー時は false。
 */
function handleSubmit(form, submitBtn, cancelBtn, errorBox)
{
    const raw = readFormValues(form);
    errorBox.textContent = "";
    try
    {
        const merged = mergeFormAndParsed(raw);

        if (state.editingId === null)
        {
            state.tasks = state.tasks.concat(createTask(merged));
        }
        else
        {
            state.tasks = updateTask(state.tasks, state.editingId, {
                title: merged.title,
                dueDate: merged.dueDate,
                priority: merged.priority,
                tags: merged.tags
            });
            state.editingId = null;
            setCancelVisible(cancelBtn, false);
            setSubmitLabel(submitBtn, false);
        }
        persist();
        resetForm(form);
        return true;
    }
    catch (error)
    {
        errorBox.textContent = error.message;
        return false;
    }
}

/**
 * raw フォーム値を自然言語パース結果とマージし、最終的なタスク入力値を返す。
 * パース結果が非 null/非空 ならそちらを優先、無ければフォーム値を使う。
 * タグはパース結果と form のタグを重複排除しつつ結合する。
 *
 * @param {{title: string, dueDate: string|null, priority: string, tags: string}} raw readFormValues の戻り値。
 * @returns {{title: string, dueDate: string|null, priority: string, tags: string[]}} createTask に渡せる形。
 */
function mergeFormAndParsed(raw)
{
    const parsed = parseNaturalInput(raw.title, new Date());
    const formTags = parseTags(raw.tags);
    return {
        title: parsed.title || raw.title.trim(),
        dueDate: parsed.dueDate || raw.dueDate || null,
        priority: parsed.priority || raw.priority || PRIORITY.MEDIUM,
        tags: mergeTags(parsed.tags, formTags)
    };
}

/**
 * 2つのタグ配列を順序を保ちつつ重複排除して結合する。
 *
 * @param {string[]} a 先に並べる配列。
 * @param {string[]} b 後に並べる配列。
 * @returns {string[]} 重複排除済みの結合配列。
 */
function mergeTags(a, b)
{
    const seen = new Set();
    const result = [];
    for (const t of a)
    {
        if (!seen.has(t))
        {
            seen.add(t);
            result.push(t);
        }
    }
    for (const t of b)
    {
        if (!seen.has(t))
        {
            seen.add(t);
            result.push(t);
        }
    }
    return result;
}

/**
 * 入力プレビューに渡す「空」のパース結果。
 *
 * @returns {{title: string, dueDate: null, tags: string[], priority: null}} 空のパース結果。
 */
function emptyParsed()
{
    return { title: "", dueDate: null, tags: [], priority: null };
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
    const previewEl = document.getElementById("input-preview");
    renderInputPreview(previewEl, emptyParsed());
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
 * 「今これ」モードでの完了処理。skip セットをリセットして次の候補が出るようにする。
 *
 * @param {string} id 完了するタスクの id。
 * @returns {void}
 */
function handleNowComplete(id)
{
    state.tasks = toggleComplete(state.tasks, id);
    state.nowSkipped = new Set();
    persist();
    refresh(document.getElementById("task-list"));
}

/**
 * 「今これ」モードでのスキップ処理。次回推薦から除外する。
 *
 * @param {string} id スキップするタスクの id。
 * @returns {void}
 */
function handleNowSkip(id)
{
    state.nowSkipped.add(id);
    refresh(document.getElementById("task-list"));
}

/**
 * 「今これ」モードからの編集要求。リストビューに切替えてから編集を開始する。
 *
 * @param {string} id 編集対象の id。
 * @returns {void}
 */
function handleNowEdit(id)
{
    state.view = VIEW.TODAY;
    state.filters.status = STATUS_FILTER.ACTIVE;
    updateFilterChips(state.filters.status);
    refresh(document.getElementById("task-list"));
    startEditing(id);
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
 * 現在の state に基づき表示を再描画する。view に応じて分岐する。
 *
 * @param {HTMLElement} list タスクリストのコンテナ要素。
 * @returns {void}
 */
function refresh(list)
{
    showView(state.view);

    if (state.view === VIEW.NOW)
    {
        const container = document.getElementById("now-mode-container");
        const candidates = state.tasks.filter(function(t)
        {
            return !state.nowSkipped.has(t.id);
        });
        const next = recommendNext(candidates, new Date());
        renderNowMode(container, next, {
            onComplete: handleNowComplete,
            onSkip: handleNowSkip,
            onEdit: handleNowEdit
        });
    }
    else if (state.view === VIEW.JOURNAL)
    {
        const container = document.getElementById("journal-container");
        const today = new Date();
        const groups = groupByCompletionDate(state.tasks, today, 30);
        const heatmap = buildMonthlyHeatmap(state.tasks, today, 4);
        renderJournal(container, groups, heatmap);
    }
    else
    {
        const filtered = applyFilters(state.tasks, state.filters);
        const sorted = sortTasks(filtered);
        renderList(list, sorted, state.tasks.length > 0, {
            onToggle: handleToggle,
            onEdit: startEditing,
            onDelete: handleDelete
        });
    }

    const completed = state.tasks.filter(function(t) { return t.completed; }).length;
    updateProgress(completed, state.tasks.length);
}

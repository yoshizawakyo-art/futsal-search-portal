/**
 * アプリ全体で使う定数を集約するモジュール。
 * マジックナンバー / 繰り返し使う文字列リテラルをここに集める。
 */

/**
 * localStorage に書き込むときのキー。
 * スキーマ変更時はサフィックスを v2, v3 と更新する。
 */
export const STORAGE_KEY = "todo-app/tasks/v1";

/**
 * 優先度の取りうる値。
 */
export const PRIORITY =
{
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low"
};

/**
 * 優先度のソート用順位。値が小さいほど優先。
 */
export const PRIORITY_ORDER =
{
    [PRIORITY.HIGH]: 0,
    [PRIORITY.MEDIUM]: 1,
    [PRIORITY.LOW]: 2
};

/**
 * 優先度の画面表示ラベル（日本語）。
 */
export const PRIORITY_LABEL =
{
    [PRIORITY.HIGH]: "高",
    [PRIORITY.MEDIUM]: "中",
    [PRIORITY.LOW]: "低"
};

/**
 * ステータスフィルタの取りうる値。
 */
export const STATUS_FILTER =
{
    ALL: "all",
    ACTIVE: "active",
    COMPLETED: "completed"
};

/**
 * 入力制約: タイトルの最大長。
 */
export const MAX_TITLE_LENGTH = 200;

/**
 * タグ入力のセパレータ（カンマ区切り）。
 */
export const TAG_SEPARATOR = ",";

/**
 * 期限日が未設定のタスクをソートで末尾に回すための番兵値。
 */
export const DUE_DATE_UNSET_SORT_VALUE = "9999-99-99";

/**
 * 画面に出す汎用メッセージ。
 */
export const MESSAGES =
{
    EMPTY_ALL: "まだ何も書いていません。\n上の入力欄から、最初の一歩を書き込んでみましょう。",
    EMPTY_FILTERED: "条件に一致するタスクがありません。",
    CONFIRM_DELETE: "このタスクを削除しますか？",
    ERROR_TITLE_REQUIRED: "タイトルを入力してください。",
    ERROR_TITLE_TOO_LONG: `タイトルは ${MAX_TITLE_LENGTH} 文字以内で入力してください。`
};

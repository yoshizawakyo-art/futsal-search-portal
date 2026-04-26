# プロジェクト用 CLAUDE.md（雛形）

このファイルはリポジトリ固有の指示をまとめます。
ユーザーレベル `~/.claude/CLAUDE.md` の全プロジェクト共通ルールを **前提** とし、
ここには **プロジェクト固有の情報** のみ記載します（重複させない）。

他リポジトリにコピーして使う場合は、下記 `TODO:` 箇所を置き換えてください。

---

## プロジェクト概要

- **名称**: futsal-search-portal（現状 ToDo アプリとして再利用予定）
- **目的**: TODO: このプロジェクトが解決する課題を 1〜2 行で
- **ステータス**: 初期開発

---

## 技術スタック

- **言語 / ランタイム**: Vanilla HTML + CSS + JavaScript (ES Modules)
- **ビルド**: 無し（静的ファイルで完結）
- **依存**: 無し（外部ライブラリを入れる時は理由を残す）
- **データ保存**: `localStorage`（key: `todo-app/tasks/v1`）

（他プロジェクト流用時は TODO: スタックを書き換え）

---

## 開発コマンド

```bash
# ローカルサーバー起動（index.html を開く）
python3 -m http.server 8000
# → http://localhost:8000

# Lint / テスト / 型チェック
# TODO: スクリプトを追加したらここに書く（現状無し）
```

---

## ディレクトリ構成

```
/
├── index.html          # エントリ HTML
├── styles.css          # スタイル
├── src/
│   ├── main.js         # 初期化・イベント結線
│   ├── storage.js      # localStorage ラッパ
│   ├── tasks.js        # CRUD 純粋関数
│   ├── filters.js      # 検索・絞り込み・ソート
│   └── ui.js           # DOM 生成・更新
├── CLAUDE.md           # 本ファイル
└── README.md           # 起動方法
```

- **ロジックと UI を分離**する方針。`tasks.js` / `filters.js` は純粋関数で書き、`ui.js` が DOM を触る。
- 新規モジュールは `src/` 配下に追加し、`main.js` から結線する。

---

## データモデル

`localStorage` key: `todo-app/tasks/v1`（スキーマ変更時はサフィックス `v2` 等で新設）

```js
{
  id: string,           // crypto.randomUUID()
  title: string,
  dueDate: string|null, // "YYYY-MM-DD"
  priority: "high" | "medium" | "low",
  tags: string[],
  completed: boolean,
  createdAt: string,    // ISO 8601
  updatedAt: string     // ISO 8601
}
```

---

## このプロジェクト固有の留意点

- **ブラウザのみで完結**するアプリなので、Node.js / サーバー側コードを勝手に追加しない。必要になったら事前に相談。
- UI は **日本語**。ラベル・エラーメッセージすべて日本語。
- 認証は無し。マルチユーザー前提のコードを書かない。
- ブラウザ通知（Notification API）は **Phase 2** で追加予定。MVP では手を付けない。
- テストフレームワークは未導入。追加する場合は `vitest` 想定（理由: 依存が軽い）。

---

## Git ブランチ運用

- 現在の開発ブランチ: `claude/todo-app-requirements-xhWrH`
- `main` 直接 push は禁止。feature ブランチで作業し、PR を作るかはユーザー指示で判断。

---

## 動作確認チェックリスト（MVP）

作業完了前に以下を手動確認すること:

- [ ] タスクの追加（タイトルのみ / 全項目入力）
- [ ] タスクの完了トグル → 並び順が変わる
- [ ] タスクの編集・削除
- [ ] 検索（タイトル・タグ部分一致）
- [ ] ステータスフィルタ（すべて / 未完了 / 完了）
- [ ] リロード後もタスクが復元される
- [ ] 空状態メッセージが適切に出る

---

## 上書きしないもの

ユーザーレベル `~/.claude/CLAUDE.md` のルールを **このリポでは変えない**。
変更が必要な場合は明示的にこのファイルに上書きルールとして記載し、理由を添える。

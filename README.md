# ToDo アプリ

Vanilla HTML / CSS / JavaScript 製のシンプルな ToDo アプリ。
外部ライブラリとビルドツールを一切使わず、静的ファイルだけで動作する。

## 機能（MVP）

- タスクの追加 / 編集 / 削除 / 完了トグル
- 期限日、優先度（高・中・低）、タグ（カンマ区切り）
- タイトル / タグに対する部分一致検索
- ステータス絞り込み（すべて / 未完了 / 完了）
- `localStorage` への自動保存（キー: `todo-app/tasks/v1`）

## 起動方法

ES Modules を使うため、`file://` ではなく HTTP サーバーから開く必要がある。
リポジトリ直下で以下を実行:

```bash
python3 -m http.server 8000
```

ブラウザで http://localhost:8000 を開く。

## ディレクトリ構成

```
/
├── index.html
├── styles.css
├── src/
│   ├── main.js          # エントリ。state 管理とイベント結線
│   ├── storage.js       # localStorage ラッパ
│   ├── tasks.js         # Task の CRUD（純粋関数）
│   ├── filters.js       # 検索・絞り込み・ソート（純粋関数）
│   ├── ui.js            # DOM 生成・更新
│   └── common/
│       └── constants.js # 全モジュールで共有する定数
├── CLAUDE.md
└── README.md
```

## 今後の拡張予定

- ブラウザ通知（期限当日 / 前日リマインド）
- 優先度・タグ単位のフィルタ
- 並び替えオプション切り替え

# tagtodo

tag_todo の CLI。全コマンドで `--json` を付けると JSON を出力するので、AI エージェントからも使える。

## 設定

tag_todo の Web 画面の「API トークン」でトークンを発行し、設定する。

```sh
npm i -g tagtodo
tagtodo config --url https://todo.example.com --token tagtodo_xxxxxxxx
```

設定ファイルの代わりに、環境変数 `TAGTODO_URL` と `TAGTODO_TOKEN` でも指定できる（環境変数が優先される）。

## 使い方

```sh
tagtodo list                      # 未完了の todo（実施日順）
tagtodo list --today              # 実施日が今日以前の todo
tagtodo list --date tomorrow --tag 仕事
tagtodo list --all --json         # 完了済みも含めて JSON で出力
tagtodo show 12                   # 1件表示（メモも表示）
tagtodo add 資料作成 --tag 仕事 急ぎ --do today --due +3d --note "会議用"
tagtodo update 12 --do +1d --add-tag 重要 --remove-tag 急ぎ
tagtodo update 12 --due none      # 期限を未設定にする
tagtodo done 12 13
tagtodo undone 12
tagtodo rm 12
tagtodo tags
```

日付は `YYYY-MM-DD`、`today`、`tomorrow`、`yesterday`、`+3d`、`-2d`、`+1w` で指定できる。

## AI エージェントから使う場合

- `--json` を付けると、結果を JSON で標準出力に出す
- エラーのときは終了コードが 1 になる。`--json` を付けていれば `{"error":{"code":"...","message":"..."}}` を出力する
  - `code` の例：`not_configured` / `unauthorized` / `not_found` / `invalid_request` / `invalid_argument` / `network_error`

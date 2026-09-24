import type { Todo } from "@tag-todo/shared";
import type { Command } from "commander";
import type { ApiClient } from "../client";
import { parseId, type CliContext } from "../context";
import { formatTodo, formatTodos } from "../format";

interface TodoFieldOptions {
  title?: string;
  note?: string;
  do?: string;
  due?: string;
  tag?: string[];
  addTag?: string[];
  removeTag?: string[];
}

/** --tag は置き換え、--add-tag / --remove-tag は現在のタグに対する追加・削除 */
async function resolveTags(api: ApiClient, id: number, options: TodoFieldOptions) {
  if (!options.addTag && !options.removeTag) return options.tag;
  const current = options.tag ?? (await api.getTodo(id)).tags;
  const removed = new Set(options.removeTag);
  return [...current, ...(options.addTag ?? [])].filter((tag) => !removed.has(tag));
}

function registerStatusCommand(program: Command, ctx: CliContext, done: boolean) {
  program
    .command(done ? "done" : "undone")
    .description(done ? "todo を完了にする" : "todo を未完了に戻す")
    .argument("<ids...>", "todo の id（複数指定可）")
    .action(async (ids: string[]) => {
      const api = await ctx.client();
      const todos: Todo[] = [];
      for (const id of ids.map(parseId)) todos.push(await api.updateTodo(id, { done }));
      ctx.print(todos, formatTodos(todos));
    });
}

export function registerEditCommands(program: Command, ctx: CliContext) {
  program
    .command("add")
    .description("todo を追加する")
    .argument("<title...>", "タイトル")
    .option("--tag <tags...>", "タグ（複数指定可）")
    .option("--do <date>", "実施日（today, tomorrow, +3d, YYYY-MM-DD など）")
    .option("--due <date>", "期限")
    .option("--note <note>", "メモ")
    .action(async (words: string[], options: TodoFieldOptions) => {
      const todo = await (
        await ctx.client()
      ).createTodo({
        title: words.join(" "),
        note: options.note,
        doDate: ctx.parseOptionalDate(options.do),
        dueDate: ctx.parseOptionalDate(options.due),
        tags: options.tag,
      });
      ctx.print(todo, formatTodo(todo));
    });

  program
    .command("update")
    .alias("edit")
    .description("todo を更新する。指定した項目だけ変更する")
    .argument("<id>", "todo の id", parseId)
    .option("--title <title>", "タイトル")
    .option("--note <note>", "メモ")
    .option("--do <date>", "実施日。none で未設定にする")
    .option("--due <date>", "期限。none で未設定にする")
    .option("--tag <tags...>", "タグを指定したものに置き換える")
    .option("--add-tag <tags...>", "タグを追加する")
    .option("--remove-tag <tags...>", "タグを外す")
    .action(async (id: number, options: TodoFieldOptions) => {
      const api = await ctx.client();
      const todo = await api.updateTodo(id, {
        title: options.title,
        note: options.note,
        doDate: ctx.parseOptionalDate(options.do),
        dueDate: ctx.parseOptionalDate(options.due),
        tags: await resolveTags(api, id, options),
      });
      ctx.print(todo, formatTodo(todo));
    });

  registerStatusCommand(program, ctx, true);
  registerStatusCommand(program, ctx, false);

  program
    .command("rm")
    .description("todo を削除する")
    .argument("<ids...>", "todo の id（複数指定可）")
    .action(async (ids: string[]) => {
      const api = await ctx.client();
      const deleted = ids.map(parseId);
      for (const id of deleted) await api.deleteTodo(id);
      const labels = deleted.map((id) => "#" + String(id));
      ctx.print({ deleted }, `削除しました: ${labels.join(", ")}`);
    });
}

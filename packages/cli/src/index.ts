#!/usr/bin/env node
import { localToday } from "@tag-todo/shared";
import { configPath } from "./config";
import { run } from "./program";

process.exitCode = await run(process.argv.slice(2), {
  env: process.env,
  configPath: configPath(),
  fetchFn: fetch,
  today: () => localToday(),
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
});

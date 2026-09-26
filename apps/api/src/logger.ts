import { Logger } from "@aws-lambda-powertools/logger";

/** CloudWatch Logs で検索しやすい JSON 形式でログを出す */
export const logger = new Logger({ serviceName: "tag-todo-api" });

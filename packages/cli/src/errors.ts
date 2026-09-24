/** CLI の利用者に表示するエラー。code は --json 出力でエージェントが判別するためのもの */
export class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CliError";
  }
}

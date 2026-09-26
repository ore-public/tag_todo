import type { Database } from "../usecases/database";

export interface AppEnv {
  Variables: {
    db: Database;
    userId: number;
  };
}

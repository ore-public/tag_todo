// http 層は db 層を直接使わない（依存方向のルール）。DB の型だけここから渡す
export type { Database } from "../db/connection";

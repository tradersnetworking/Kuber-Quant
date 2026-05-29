declare module "archiver" {
  import type { Stream } from "node:stream";

  interface Archiver extends Stream {
    append(source: unknown, options?: { name?: string; prefix?: string; date?: Date | string }): Archiver;
    directory(dirpath: string, destpath: string, data?: unknown): Archiver;
    file(filename: string, data: unknown): Archiver;
    finalize(): Promise<void>;
  }

  function archiver(format: string, options?: Record<string, unknown>): Archiver;

  export = archiver;
}

declare module "better-sqlite3-multiple-ciphers" {
  const Database: {
    new (filename?: string | Buffer, options?: Record<string, unknown>): any;
    (filename?: string, options?: Record<string, unknown>): any;
  };
  export = Database;
}

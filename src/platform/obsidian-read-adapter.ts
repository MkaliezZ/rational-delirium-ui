/** Narrow READ-ONLY storage interface consumed by core. No Vault
 * write API (create/modify/delete/rename/process) is exposed here,
 * and no implementation of this interface may add one. */

export interface ReadAdapter {
  list(): readonly string[];
  read(path: string): Promise<string>;
  mtime(path: string): number;
}

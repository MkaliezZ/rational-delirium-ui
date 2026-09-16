/** Exact-path, short-filename and unresolved-reference dependency
 * tracking. Rename/delete only invalidates affected dependents. */

export class DependencyMap {
  /** dependent path -> set of paths it references (exact when known). */
  private readonly byDependent = new Map<string, Set<string>>();
  /** referenced exact path -> dependents. */
  private readonly exact = new Map<string, Set<string>>();
  /** referenced bare filename -> dependents. */
  private readonly byFilename = new Map<string, Set<string>>();
  /** unresolved reference names -> dependents. */
  readonly unresolved = new Map<string, Set<string>>();

  setDependencies(path: string, refs: readonly string[]): void {
    this.remove(path);
    const own = new Set<string>(refs);
    this.byDependent.set(path, own);
    for (const ref of refs) {
      if (ref.startsWith("/")) {
        // absolute-in-vault style reference
        addToSet(this.exact, ref.replace(/^\//, ""), path);
        continue;
      }
      if (ref.includes("/")) {
        addToSet(this.exact, ref, path);
        addToSet(this.exact, ref + ".md", path);
        addToSet(this.byFilename, ref.split("/").pop() ?? ref, path);
        continue;
      }
      addToSet(this.byFilename, ref, path);
      addToSet(this.exact, ref + ".md", path);
      addToSet(this.unresolved, ref, path);
    }
  }

  remove(path: string): void {
    const refs = this.byDependent.get(path);
    if (!refs) return;
    for (const ref of refs) {
      removeFromSet(this.exact, ref, path);
      removeFromSet(this.exact, ref.replace(/^\//, ""), path);
      const fname = ref.split("/").pop() ?? ref;
      removeFromSet(this.byFilename, fname, path);
      removeFromSet(this.unresolved, ref, path);
    }
    this.byDependent.delete(path);
  }

  /** Paths whose parse output could change because `changed` was
   * renamed/deleted/modified: the file itself plus dependents. */
  affectedBy(changed: string): Set<string> {
    const norm = changed.replace(/\\/g, "/");
    const affected = new Set<string>([norm]);
    for (const dep of this.exact.get(norm) ?? []) affected.add(dep);
    const fname = norm.split("/").pop() ?? norm;
    for (const dep of this.byFilename.get(fname) ?? []) affected.add(dep);
    return affected;
  }
}

function addToSet<K>(map: Map<K, Set<string>>, key: K, value: string): void {
  const set = map.get(key);
  if (set) set.add(value);
  else map.set(key, new Set([value]));
}

function removeFromSet<K>(map: Map<K, Set<string>>, key: K, value: string): void {
  const set = map.get(key);
  if (!set) return;
  set.delete(value);
  if (set.size === 0) map.delete(key);
}

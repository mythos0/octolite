/**
 * OctoLite — GitHub-style URL path resolution.
 *
 * Repo file URLs look like GitHub's:
 *
 *   /<repo>/tree/<ref>/<dir…>
 *   /<repo>/blob/<ref>/<file…>
 *
 * The first path segment(s) identify the ref (branch or commit sha); the
 * remaining segments are the in-repo path. Branch names may themselves
 * contain slashes (e.g. `feature/x`), so we match the LONGEST branch prefix
 * first — exactly like GitHub does.
 */

export interface ResolvedRefPath {
  /** Branch name or commit sha the URL points at. */
  ref: string;
  /** Whether the ref was taken from the URL (false = fell back to default). */
  fromUrl: boolean;
  /** Remaining path segments after the ref (may be empty for the ref root). */
  segments: string[];
  /** segments joined with "/" ("" for ref root). */
  dirPath: string;
}

const SHA_RE = /^[0-9a-f]{7,40}$/i;

/**
 * Resolve `<ref>/<path…>` segments against the repo's branches.
 *
 * - Longest matching branch prefix wins (so `feature/x` beats `feature`).
 * - A 7-40 hex sha is accepted as a permalink ref.
 * - Otherwise the whole path is treated as relative to `defaultBranch`.
 */
export function resolveRefAndPath(
  segments: string[],
  branches: string[],
  defaultBranch: string
): ResolvedRefPath {
  const parts = segments ?? [];

  // longest branch prefix first
  const sorted = [...branches].sort((a, b) => b.length - a.length);
  for (const b of sorted) {
    if (parts[0] === b) {
      return { ref: b, fromUrl: true, segments: parts.slice(1), dirPath: parts.slice(1).join("/") };
    }
    if (b.includes("/") && parts.length > 1) {
      const candidate = parts.slice(0, b.split("/").length).join("/");
      if (candidate === b) {
        const rest = parts.slice(b.split("/").length);
        return { ref: b, fromUrl: true, segments: rest, dirPath: rest.join("/") };
      }
    }
  }

  // commit sha permalink
  if (parts[0] && SHA_RE.test(parts[0])) {
    return { ref: parts[0], fromUrl: true, segments: parts.slice(1), dirPath: parts.slice(1).join("/") };
  }

  // no ref in URL — the whole path is relative to the default branch
  return {
    ref: defaultBranch,
    fromUrl: false,
    segments: parts,
    dirPath: parts.join("/"),
  };
}

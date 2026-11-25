/**
 * Where to go after signing in or up: the `redirect` query parameter when it's a path on
 * this site (the invite page sends new users through sign-up and back), else home. Anything
 * that could leave the site ("//host", "/\host", "https://...") is ignored.
 */
export function redirectTarget(search: string): string {
  const target = new URLSearchParams(search).get("redirect");
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return "/";
  }
  return target;
}

/** The query string that carries a redirect on to another auth page, or "" for home. */
export function redirectQuery(search: string): string {
  const target = redirectTarget(search);
  return target === "/" ? "" : `?redirect=${encodeURIComponent(target)}`;
}

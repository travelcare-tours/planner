/**
 * Helper to resolve static asset paths accounting for GitHub Pages repository subpaths.
 */
export function getAssetPath(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (typeof window !== 'undefined') {
    // Dynamic runtime check: if deployed on GitHub Pages project subpath
    if (window.location.pathname.startsWith('/planner')) {
      return `/planner${cleanPath}`;
    }
  }

  const envBase = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${envBase}${cleanPath}`;
}

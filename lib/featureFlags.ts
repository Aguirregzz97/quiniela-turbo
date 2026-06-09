/**
 * Centralized feature flags. Flip these to true/false to show/hide
 * entire surfaces of the app without having to touch the affected
 * pages and components individually.
 *
 * These are plain TypeScript constants — Next.js inlines them at build
 * time for both server and client bundles, so toggling one and
 * redeploying is enough. No env vars or runtime config needed.
 */

/**
 * Master switch for the Survivor product. When false, Survivor is
 * removed from:
 *   - the sidebar/navbar entry
 *   - the Puntuaciones page (the Survivor tab is hidden and the
 *     Quinielas tab takes over the full surface)
 *   - the Estadísticas page (same as above)
 *
 * The Survivor routes themselves remain reachable by URL — disabling
 * the flag is intended to hide entry points while we iterate, not to
 * break existing bookmarks or invites. If you need a hard kill switch
 * that 404s the routes too, do that at the route level.
 */
export const SURVIVOR_ENABLED = false;

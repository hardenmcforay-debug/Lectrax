/**
 * Local re-export — Turbopack cannot resolve `@hookform/resolvers/zod`
 * because the package exports point at missing `.mjs` files.
 */
export { zodResolver } from "@hookform/resolvers/zod/dist/zod.js";

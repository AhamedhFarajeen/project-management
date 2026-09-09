import type { CorsOptions } from "cors";

export function getAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  // FRONTEND_URL remains supported for existing local Clerk configurations.
  const configured = env.CORS_ORIGINS ?? env.FRONTEND_URL ??
    (env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  const values = configured.split(",").map(value => value.trim()).filter(Boolean);
  if (!values.length) throw new Error("Set CORS_ORIGINS to the allowed frontend origins");
  return [...new Set(values.map(value => {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error("CORS_ORIGINS must contain absolute HTTP(S) origins"); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.hostname.includes('*') || url.pathname !== '/' || url.search || url.hash) {
      throw new Error("CORS_ORIGINS must contain origins only, without paths, credentials, queries, or wildcards");
    }
    return url.origin;
  }))];
}

export function getCorsOptions(origins: string[]): CorsOptions {
  return {
    origin: origins,
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}

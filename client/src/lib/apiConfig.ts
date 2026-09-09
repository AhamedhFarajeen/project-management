export function parseApiBaseUrl(value: string | undefined): string {
  const message = "NEXT_PUBLIC_API_BASE_URL must be an absolute HTTP(S) backend URL without credentials, query parameters, or a fragment";
  if (!value?.trim()) throw new Error(message);
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(message);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error(message);
  }
  // Keep an optional backend path prefix and normalize trailing slashes.
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
  return url.toString();
}

// Static property access is required for Next.js to embed this public variable.
export const API_BASE_URL = parseApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

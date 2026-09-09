export function profileImage(value?: string | null): string {
  if (!value) return "/p1.jpeg";
  if (value.startsWith("https://")) return value;
  return `/${value.replace(/^\/+/, "")}`;
}

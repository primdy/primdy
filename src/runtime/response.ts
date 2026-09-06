export function json<T>(value: T, init?: ResponseInit) {
  return Response.json(value, init);
}
export function text(value: string, init?: ResponseInit) {
  return new Response(value, init);
}
export function redirect(url: string | URL, status = 307) {
  return Response.redirect(url, status);
}

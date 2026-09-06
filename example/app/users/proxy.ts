export function proxy(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

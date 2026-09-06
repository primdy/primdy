export async function GET(
  request: Request,
  { params }: { params: { slug: string[] } }
) {
  return Response.json({ slug: params.slug })
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string[] } }
) {
  return Response.json({ slug: params.slug ?? [] })
}

export async function GET() {
  return Response.json({
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  });
}

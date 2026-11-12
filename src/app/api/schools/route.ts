import { NextResponse } from "next/server";
import { loadSchools } from "@/lib/schools/load";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get("cityId");
  const schools = await loadSchools(cityId);
  return NextResponse.json(schools, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}

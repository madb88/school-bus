import { NextResponse } from "next/server";
import { loadCities } from "@/lib/schools/load";

export const runtime = "nodejs";

export async function GET() {
  const cities = await loadCities();
  return NextResponse.json(cities, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}

import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/geocode";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    return NextResponse.json({ places: await searchPlaces(q) });
  } catch {
    return NextResponse.json({ places: [] });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getProjectCatalogue } from "@/lib/project-catalogue";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return NextResponse.json(getProjectCatalogue({
    query: params.get("q") || "",
    emirate: params.get("emirate") || "",
    developer: params.get("developer") || "",
    propertyType: params.get("type") || "",
    bedrooms: params.get("bedrooms") || "",
    maxPrice: Number(params.get("maxPrice") || 0),
    page: Number(params.get("page") || 1),
  }));
}

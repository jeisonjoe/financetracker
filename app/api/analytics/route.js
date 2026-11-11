import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function GET(req) {
  return ApiController.handle(async ({ services, user }) => {
    const period = req.nextUrl.searchParams.get("period") || "this_month";
    const overview = await services.analyticsService.getDashboardOverview(
      user.id,
      period
    );
    return NextResponse.json(overview);
  });
}


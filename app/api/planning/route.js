import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function GET() {
  return ApiController.handle(async ({ services, user }) => {
    const overview = await services.planningService.getOverview(user.id);
    return NextResponse.json(overview);
  });
}

export async function PATCH(req) {
  return ApiController.handle(async ({ services, user }) => {
    const body = await req.json();
    const updated = await services.planningService.updatePlan(user.id, body);
    return NextResponse.json(updated);
  });
}


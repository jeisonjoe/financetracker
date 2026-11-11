import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function GET() {
  return ApiController.handle(async ({ services, user }) => {
    const goals = await services.planningService.listGoals(user.id);
    return NextResponse.json(goals);
  });
}

export async function POST(req) {
  return ApiController.handle(async ({ services, user }) => {
    const body = await req.json();
    const created = await services.planningService.createGoal(user.id, body);
    return NextResponse.json(created, { status: 201 });
  });
}


import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function GET() {
  return ApiController.handle(async ({ services, user }) => {
    const items = await services.planningService.listRecurring(user.id);
    return NextResponse.json(items);
  });
}

export async function POST(req) {
  return ApiController.handle(async ({ services, user }) => {
    const body = await req.json();
    const created = await services.planningService.createRecurring(user.id, body);
    return NextResponse.json(created, { status: 201 });
  });
}


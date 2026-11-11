import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function PATCH(req, context) {
  return ApiController.handle(async ({ services, user }) => {
    const { id } = await context.params;
    const body = await req.json();
    const updated = await services.planningService.updateRecurring(id, user.id, body);
    return NextResponse.json(updated);
  });
}

export async function POST(req, context) {
  return ApiController.handle(async ({ services, user }) => {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = body.action === "skip" ? "skip" : "log";
    const result = await services.planningService.processRecurringCycle(id, user.id, action);
    return NextResponse.json(result);
  });
}

export async function DELETE(_req, context) {
  return ApiController.handle(async ({ services, user }) => {
    const { id } = await context.params;
    await services.planningService.deleteRecurring(id, user.id);
    return NextResponse.json({ success: true });
  });
}


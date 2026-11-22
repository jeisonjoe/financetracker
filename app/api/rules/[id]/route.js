import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function PATCH(req, { params }) {
  return ApiController.handle(async ({ services, user }) => {
    const { id } = await params;
    const body = await req.json();
    const updated = await services.ruleService.update(id, user.id, body);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req, { params }) {
  return ApiController.handle(async ({ services, user }) => {
    const { id } = await params;
    await services.ruleService.remove(id, user.id);
    return NextResponse.json({ success: true });
  });
}

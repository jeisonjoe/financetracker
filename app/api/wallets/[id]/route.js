import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function PATCH(req, context) {
  return ApiController.handle(async ({ services, user }) => {
    const { id } = await context.params;
    const body = await req.json();
    const updated = await services.walletService.update(id, user.id, body);
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req, context) {
  return ApiController.handle(async ({ services, user }) => {
    const { id } = await context.params;
    await services.walletService.remove(id, user.id);
    return NextResponse.json({ success: true });
  });
}


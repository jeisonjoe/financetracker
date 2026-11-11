import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function POST(req) {
  return ApiController.handle(async ({ services, user }) => {
    const body = await req.json();
    const updated = await services.transactionService.update(
      body.id,
      user.id,
      body
    );
    return NextResponse.json({ success: true, data: updated });
  });
}

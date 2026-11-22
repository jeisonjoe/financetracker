import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function POST(req) {
  return ApiController.handle(async ({ services, user }) => {
    const body = await req.json();
    const created = await services.planningService.recordDebtRepayment(user.id, body);
    return NextResponse.json({ data: created }, { status: 201 });
  });
}

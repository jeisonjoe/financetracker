import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export const dynamic = "force-dynamic";

export async function GET() {
  return ApiController.handle(async ({ services, user }) => {
    const wallets = await services.walletService.list(user.id);
    return NextResponse.json(wallets);
  });
}

export async function POST(req) {
  return ApiController.handle(async ({ services, user }) => {
    const body = await req.json();
    const created = await services.walletService.create(user.id, body);
    return NextResponse.json(created, { status: 201 });
  });
}

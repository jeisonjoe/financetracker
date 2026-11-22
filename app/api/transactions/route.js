import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export const dynamic = "force-dynamic";

export async function GET(req) {
  return ApiController.handle(async ({ services, user }) => {
    const sp = req.nextUrl.searchParams;
    const result = await services.transactionService.list(user.id, {
      page: Number(sp.get("page") || 0),
      pageSize: Number(sp.get("pageSize") || 20),
      type: sp.get("type") || null,
      search: sp.get("search") || "",
      wallet: sp.get("wallet") || "",
      category: sp.get("category") || "",
      tag: sp.get("tag") || "",
    });
    return NextResponse.json(result);
  });
}

export async function POST(req) {
  return ApiController.handle(async ({ services, user }) => {
    const body = await req.json();
    const created = await services.transactionService.create(user.id, body);
    return NextResponse.json({ data: created }, { status: 201 });
  });
}


import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function GET() {
  return ApiController.handle(async ({ services, user }) => {
    const categories = await services.categoryService.list(user.id);
    return NextResponse.json(categories);
  });
}

export async function POST(req) {
  return ApiController.handle(async ({ services, user }) => {
    const body = await req.json();
    const created = await services.categoryService.create(user.id, body);
    return NextResponse.json(created, { status: 201 });
  });
}

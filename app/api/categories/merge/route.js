import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function POST(req) {
  return ApiController.handle(async ({ services, user }) => {
    const body = await req.json();
    const result = await services.categoryService.mergeCategories(
      user.id,
      body.sourceId,
      body.targetId
    );
    return NextResponse.json(result);
  });
}

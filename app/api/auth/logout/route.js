import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function POST() {
  return ApiController.handle(
    async ({ services }) => {
      await services.authService.logout();
      return NextResponse.json({ success: true });
    },
    { requireAuth: false }
  );
}


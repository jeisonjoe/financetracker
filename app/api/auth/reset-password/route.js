import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function POST(req) {
  return ApiController.handle(
    async ({ services }) => {
      const { password, token } = await req.json();
      const result = await services.authService.resetPassword({
        password,
        token: token || null,
      });
      return NextResponse.json(result);
    },
    { requireAuth: false }
  );
}


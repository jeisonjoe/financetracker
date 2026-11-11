import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function POST(req) {
  return ApiController.handle(
    async ({ services }) => {
      const { email } = await req.json();
      const origin = req.nextUrl.origin;
      const result = await services.authService.requestPasswordReset(
        email,
        origin
      );
      return NextResponse.json(result);
    },
    { requireAuth: false }
  );
}


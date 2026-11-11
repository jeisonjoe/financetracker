import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function POST(req) {
  return ApiController.handle(
    async ({ services }) => {
      const { email, password, firstName, lastName } = await req.json();
      const user = await services.authService.register({
        email,
        password,
        firstName,
        lastName,
      });
      return NextResponse.json(
        { user: user.toJSON(), provider: services.provider },
        { status: 201 }
      );
    },
    { requireAuth: false }
  );
}


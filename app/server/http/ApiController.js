import { NextResponse } from "next/server.js";
import { ServiceContainer } from "../services/ServiceContainer.js";
import { AppError, UnauthorizedError } from "../domain/errors.js";

/**
 * Shared HTTP controller helper handling dependency resolution, authentication
 * enforcement, and consistent JSON error responses across all API routes.
 */
export class ApiController {
  static async handle(handler, { requireAuth = true } = {}) {
    try {
      const services = ServiceContainer.create();
      let user = null;

      if (requireAuth) {
        user = await services.authService.getCurrentUser();
        if (!user) {
          throw new UnauthorizedError("Please sign in to continue");
        }
      }

      return await handler({ services, user });
    } catch (error) {
      return ApiController.errorResponse(error);
    }
  }

  static errorResponse(error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error("Unhandled API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}


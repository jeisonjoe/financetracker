import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ApiController } from "@/app/server/http/ApiController";
import { GooglePayParser } from "@/app/lib/import/GooglePayParser";

export async function GET() {
  return ApiController.handle(async () => {
    const filePath = path.join(process.cwd(), "app/dataImports/My Activity.html");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Import source file not found at app/dataImports/My Activity.html" },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    const parser = new GooglePayParser();
    const transactions = parser.parse(fileContent);

    return NextResponse.json({
      count: transactions.length,
      transactions,
    });
  });
}

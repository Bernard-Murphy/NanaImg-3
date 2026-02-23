import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // Select one random image file (listed, not removed)
  const rows = await prisma.$queryRaw<Array<{ fileUrl: string }>>(Prisma.sql`
    SELECT "fileUrl"
    FROM files
    WHERE removed = false
      AND unlisted = false
      AND "mimeType" LIKE 'image/%'
    ORDER BY RANDOM()
    LIMIT 1
  `);

  const file = rows[0];
  if (!file?.fileUrl) {
    const base = new URL(request.url).origin;
    return NextResponse.redirect(`${base}/`, 302);
  }

  return NextResponse.redirect(file.fileUrl, 302);
}

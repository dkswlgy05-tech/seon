import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildHwpx } from "@/lib/hwpx";
import type { Week } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const week = (await request.json()) as Week;
    const templatePath = path.join(process.cwd(), "public", "template.hwpx");
    const templateBuf = await readFile(templatePath);
    // Convert Buffer to a clean ArrayBuffer slice (avoids TS ArrayBufferLike issues)
    const ab = templateBuf.buffer.slice(
      templateBuf.byteOffset,
      templateBuf.byteOffset + templateBuf.byteLength
    ) as ArrayBuffer;
    const out = await buildHwpx(ab, week);

    return new NextResponse(new Uint8Array(out), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.hancom.hwpx",
        "Content-Disposition": `attachment; filename="weekly-${encodeURIComponent(
          week.label
        )}.hwpx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[hwpx] build failed:", msg);
    return new NextResponse(msg, { status: 500 });
  }
}

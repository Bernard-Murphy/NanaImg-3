import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile, getFileUrl } from "@/lib/s3";
import { generateThumbnail } from "@/lib/thumbnail";
import { verifyRecaptchaToken, extractAuth, getAnonData } from "@/lib/ai-auth";
import md5 from "md5";

const VENICE_API_URL = "https://api.venice.ai/api/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      style,
      uncensored,
      imageBase64,
      disableComments,
      unlisted,
      anonymous,
      recaptchaToken,
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const recaptchaValid = await verifyRecaptchaToken(recaptchaToken);
    if (!recaptchaValid) {
      return NextResponse.json(
        { error: "reCAPTCHA validation failed" },
        { status: 400 },
      );
    }

    const user = extractAuth(req);
    const anonData = getAnonData(req);
    const userId = anonymous ? null : user?.userId || null;
    const userConnect = userId ? { connect: { id: userId } } : undefined;

    const veniceApiKey = process.env.VENICE_API_KEY;
    if (!veniceApiKey) {
      return NextResponse.json(
        { error: "Venice API key not configured" },
        { status: 500 },
      );
    }

    const model = uncensored ? "z-image-turbo" : "grok-imagine";
    const safeMode = !uncensored;

    const veniceBody: Record<string, any> = {
      model,
      prompt: prompt.trim(),
      safe_mode: safeMode,
      format: "png",
      width: 1024,
      height: 1024,
      hide_watermark: true,
    };

    if (style && style !== "Auto") {
      veniceBody.style_preset = style;
    }

    const veniceResponse = await fetch(`${VENICE_API_URL}/image/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${veniceApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(veniceBody),
    });

    if (!veniceResponse.ok) {
      const errorData = await veniceResponse.json().catch(() => ({}));
      console.error("Venice API error:", veniceResponse.status, errorData);
      return NextResponse.json(
        { error: errorData.error || "Image generation failed" },
        { status: 502 },
      );
    }

    const veniceData = await veniceResponse.json();
    const base64Image = veniceData.images?.[0];
    if (!base64Image) {
      return NextResponse.json(
        { error: "No image returned from Venice" },
        { status: 502 },
      );
    }

    const imageBuffer = Buffer.from(base64Image, "base64");
    const hash = md5(prompt + Date.now());
    const key = `files/${hash}.png`;

    await uploadFile(key, imageBuffer, "image/png");

    const fileUrl = getFileUrl(key);
    const hashedFileName = key.split("/").pop()!;

    let thumbnailUrl = null;
    try {
      const thumbKey = await generateThumbnail(
        imageBuffer,
        "image/png",
        hashedFileName,
      );
      if (thumbKey) thumbnailUrl = getFileUrl(thumbKey);
    } catch (error) {
      console.error("Thumbnail generation error:", error);
    }

    const file = await prisma.file.create({
      data: {
        name: "AI generated image",
        manifesto: prompt.trim(),
        fileName: `${hash}.png`,
        fileSize: imageBuffer.length,
        mimeType: "image/png",
        hashedFileName,
        fileUrl,
        thumbnailUrl,
        user: userConnect,
        anonId: anonData.anonId,
        anonTextColor: anonData.anonTextColor,
        anonTextBackground: anonData.anonTextBackground,
        unlisted: Boolean(unlisted),
        nsfw: Boolean(uncensored),
      },
    });

    return NextResponse.json({ fileId: file.id });
  } catch (error: any) {
    console.error("AI image generation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile, getFileUrl } from "@/lib/s3";
import { verifyRecaptchaToken, extractAuth, getAnonData } from "@/lib/ai-auth";
import md5 from "md5";
import fs from "fs";
import path from "path";

const VENICE_API_URL = "https://api.venice.ai/api/v1";
const MUSICGPT_API_URL = "https://api.musicgpt.com/api/public/v1";
const MUSICGPT_POLL_INTERVAL = 5000;
const MUSICGPT_TIMEOUT = 1800000;

async function generateLyricsWithVenice(
  prompt: string,
  uncensored: boolean,
): Promise<string> {
  console.log("lyrics prompt", prompt);
  const veniceApiKey = process.env.VENICE_API_KEY;
  if (!veniceApiKey) throw new Error("Venice API key not configured");

  // const model = uncensored ? "zai-org-glm-4.7-flash" : "grok-41-fast";
  const model = "grok-41-fast";
  const messages: Array<{ role: string; content: string }> = [];

  if (uncensored) {
    try {
      const promptPath = path.join(process.cwd(), "uncensored-prompt.txt");
      const systemPrompt = fs.readFileSync(promptPath, "utf-8").trim();
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
    } catch {
      // File not found, proceed without system prompt
    }
  }

  messages.push({
    role: "user",
    content: `Write a 3-4 stanza song based on the following prompt. Only output the lyrics, nothing else:\n\n${prompt}`,
  });

  const response = await fetch(`${VENICE_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${veniceApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Venice lyrics generation failed (${response.status})`,
    );
  }

  const data = await response.json();
  let lyrics = data.choices?.[0]?.message?.content;
  console.log("venice lyrics", lyrics);

  if (!lyrics) throw new Error("No lyrics returned from Venice");
  lyrics = lyrics.replaceAll(/nigger/gi, "niggur");
  lyrics = lyrics.replaceAll(/faggot/gi, "phag it");
  lyrics = lyrics.replaceAll(/fag/gi, "phag");
  lyrics = lyrics.replaceAll(/bitch/gi, "bidch");
  lyrics = lyrics.replaceAll(/kike/gi, "qaiq");
  lyrics = lyrics.replaceAll(/chink/gi, "chinq");
  lyrics = lyrics.replaceAll(/cunt/gi, "kunt");
  lyrics = lyrics.replaceAll(/spic/gi, "spik");
  lyrics = lyrics.replaceAll(/gook/gi, "gooq");
  return lyrics.trim();
}

async function getConversionById(
  apiKey: string,
  conversionId: string,
): Promise<{
  status: string;
  audio_url?: string;
  title?: string;
  lyrics?: string;
} | null> {
  const response = await fetch(
    `${MUSICGPT_API_URL}/byId?conversionType=MUSIC_AI&conversion_id=${encodeURIComponent(conversionId)}`,
    { headers: { Authorization: apiKey } },
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.conversion || null;
}

async function generateSongWithMusicGPT(
  lyrics: string,
  musicStyle: string,
  onStatus?: (status: string) => void,
): Promise<Array<{ mp3Url: string; title?: string }>> {
  const apiKey = process.env.MUSICGPT_API_KEY;
  if (!apiKey) throw new Error("MusicGPT API key not configured");

  onStatus?.("Generating song...");

  const generateResponse = await fetch(`${MUSICGPT_API_URL}/MusicAI`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lyrics,
      music_style: musicStyle || "Pop",
    }),
  });
  console.log("musicgpt generateResponse", generateResponse);
  if (!generateResponse.ok) {
    const errorData = await generateResponse.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        `MusicGPT generation failed (${generateResponse.status})`,
    );
  }

  const taskData = await generateResponse.json();
  if (!taskData.success) {
    throw new Error(taskData.error || "MusicGPT generation failed");
  }

  const conversionId1 = taskData.conversion_id_1;
  const conversionId2 = taskData.conversion_id_2;
  if (!conversionId1 && !conversionId2) {
    throw new Error("No conversion IDs returned from MusicGPT");
  }

  const conversionIds = [conversionId1, conversionId2].filter(Boolean);
  const results: Array<{ mp3Url: string; title?: string }> = [];
  const startTime = Date.now();

  const completedIds = new Set<string>();

  while (Date.now() - startTime < MUSICGPT_TIMEOUT) {
    onStatus?.("Waiting for music...");
    for (const conversionId of conversionIds) {
      if (completedIds.has(conversionId)) continue;
      const conversion = await getConversionById(apiKey, conversionId);
      if (!conversion) continue;
      if (conversion.status === "COMPLETED" && conversion.audio_url) {
        if (!results.some((r) => r.mp3Url === conversion.audio_url)) {
          results.push({
            mp3Url: conversion.audio_url,
            title: conversion.title,
          });
          completedIds.add(conversionId);
        }
      } else if (
        conversion.status === "FAILED" ||
        conversion.status === "ERROR"
      ) {
        completedIds.add(conversionId);
      }
    }

    if (results.length >= conversionIds.length) {
      return results;
    }

    await new Promise((resolve) => setTimeout(resolve, MUSICGPT_POLL_INTERVAL));
  }

  if (results.length === 0) {
    throw new Error("MusicGPT music generation timed out");
  }
  return results;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    title,
    lyrics: rawLyrics,
    lyricsPrompt,
    musicStyle,
    generateLyrics,
    uncensored,
    disableComments,
    unlisted,
    anonymous,
    recaptchaToken,
  } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
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

  if (generateLyrics) {
    if (
      !lyricsPrompt ||
      typeof lyricsPrompt !== "string" ||
      lyricsPrompt.trim().length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Lyrics prompt is required when generating lyrics automatically",
        },
        { status: 400 },
      );
    }
  } else {
    if (
      !rawLyrics ||
      typeof rawLyrics !== "string" ||
      rawLyrics.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Lyrics are required" },
        { status: 400 },
      );
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      try {
        let lyrics: string;
        if (generateLyrics) {
          write({ status: "Generating lyrics..." });
          lyrics = await generateLyricsWithVenice(
            lyricsPrompt.trim(),
            Boolean(uncensored),
          );
        } else {
          lyrics = rawLyrics.trim();
        }

        const songs = await generateSongWithMusicGPT(
          lyrics,
          musicStyle || "",
          (status) => write({ status }),
        );

        if (songs.length === 0) {
          write({ done: true, error: "No songs were generated" });
          controller.close();
          return;
        }

        write({ status: "Uploading..." });

        const createdFiles = [];

        for (const song of songs) {
          if (!song.mp3Url) continue;

          const mp3Response = await fetch(song.mp3Url);
          if (!mp3Response.ok) {
            console.error("Failed to download song:", song.mp3Url);
            continue;
          }

          const mp3Buffer = Buffer.from(await mp3Response.arrayBuffer());
          const hash = md5(title + Date.now() + Math.random());
          const key = `files/${hash}.mp3`;

          await uploadFile(key, mp3Buffer, "audio/mpeg");

          const fileUrl = getFileUrl(key);
          const hashedFileName = key.split("/").pop()!;

          const file = await prisma.file.create({
            data: {
              name: title.trim(),
              manifesto: lyrics,
              fileName: `${hash}.mp3`,
              fileSize: mp3Buffer.length,
              mimeType: "audio/mpeg",
              hashedFileName,
              fileUrl,
              thumbnailUrl: null,
              user: userConnect,
              anonId: anonData.anonId,
              anonTextColor: anonData.anonTextColor,
              anonTextBackground: anonData.anonTextBackground,
              unlisted: Boolean(unlisted),
              nsfw: Boolean(uncensored),
            },
          });

          createdFiles.push(file);
        }

        if (createdFiles.length === 0) {
          write({ done: true, error: "Failed to process generated songs" });
          controller.close();
          return;
        }

        if (createdFiles.length === 1) {
          write({ done: true, fileId: createdFiles[0].id });
        } else {
          const album = await prisma.album.create({
            data: {
              name: title.trim(),
              manifesto: lyrics,
              user: userConnect,
              anonId: anonData.anonId,
              anonTextColor: anonData.anonTextColor,
              anonTextBackground: anonData.anonTextBackground,
              unlisted: Boolean(unlisted),
            },
          });

          for (const file of createdFiles) {
            await prisma.file.update({
              where: { id: file.id },
              data: { albumId: album.id },
            });
          }
          write({
            done: true,
            albumId: album.id,
            fileIds: createdFiles.map((f) => f.id),
          });
        }
      } catch (error: any) {
        console.error("AI music generation error:", error);
        write({ done: true, error: error.message || "Internal server error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

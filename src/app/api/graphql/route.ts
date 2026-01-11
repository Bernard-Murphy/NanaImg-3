import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest, NextResponse } from "next/server";
import { createApolloServer } from "@/lib/graphql/apollo-server";
import {
  verifyJWT,
  generateAnonId,
  generateRandomColor,
  AuthPayload,
  AnonymousData,
} from "@/lib/session";

const server = createApolloServer();

function decodeCookieValue(value: string): string {
  let decoded = value;
  try {
    while (true) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        break;
      }
      decoded = next;
    }
  } catch (error) {
    return value;
  }
  return decoded;
}

// Helper function to get or create anonymous data from cookies
function getAnonDataFromCookies(cookieHeader: string | null): AnonymousData {
  if (!cookieHeader) {
    const anonData = {
      anonId: generateAnonId(),
      anonTextColor: generateRandomColor(),
      anonTextBackground: generateRandomColor(),
    };
    return anonData;
  }

  const anonIdMatch = cookieHeader.match(/anon-id=([^;]+)/);
  const anonTextColorMatch = cookieHeader.match(/anon-text-color=([^;]+)/);
  const anonTextBackgroundMatch = cookieHeader.match(
    /anon-text-background=([^;]+)/
  );

  if (anonIdMatch && anonTextColorMatch && anonTextBackgroundMatch) {
    return {
      anonId: decodeCookieValue(anonIdMatch[1]),
      anonTextColor: decodeCookieValue(anonTextColorMatch[1]),
      anonTextBackground: decodeCookieValue(anonTextBackgroundMatch[1]),
    };
  }

  // Generate new anon data if cookies are incomplete
  const anonData = {
    anonId: generateAnonId(),
    anonTextColor: generateRandomColor(),
    anonTextBackground: generateRandomColor(),
  };
  return anonData;
}

const apolloHandlerPromise = startServerAndCreateNextHandler(server, {
  context: async (req) => {
    // Extract JWT token from Authorization header or cookie
    const headers = req.headers as any;
    const authHeader = headers.get?.("authorization") || headers.authorization;
    let token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      const cookieHeader = headers.get?.("cookie");
      const match = cookieHeader?.match(/auth-token=([^;]+)/);
      token = match ? match[1] : null;
    }
    const user = token ? verifyJWT(token) : null;

    // Get persistent anonymous data from cookies
    const cookieHeader = headers.get?.("cookie");
    const anonData = getAnonDataFromCookies(cookieHeader);
    const reqWithAnon = req as NextRequest & { anonData?: AnonymousData };
    reqWithAnon.anonData = anonData;

    return {
      req: reqWithAnon,
      user,
      anonData,
    };
  },
});

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const apolloHandler = await apolloHandlerPromise;
    const response = await apolloHandler(req);

    // Create NextResponse from the Apollo response
    const responseBody = await response.text();
    const newResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // Set anonymous data cookies for persistence
    const cookieHeader = req.headers.get("cookie");
    const storedAnonData =
      (req as NextRequest & { anonData?: AnonymousData }).anonData ||
      getAnonDataFromCookies(cookieHeader);

    // Set cookies with 30 day expiration to persist anonymous data
    newResponse.cookies.set("anon-id", storedAnonData.anonId, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: false, // Allow client-side access
      sameSite: "lax",
    });

    newResponse.cookies.set("anon-text-color", storedAnonData.anonTextColor, {
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        httpOnly: false, // Allow client-side access
        sameSite: "lax",
      }
    );

    newResponse.cookies.set(
      "anon-text-background",
      storedAnonData.anonTextBackground,
      {
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        httpOnly: false, // Allow client-side access
        sameSite: "lax",
      }
    );

    return newResponse;
  } catch (error) {
    console.error("Apollo handler error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}

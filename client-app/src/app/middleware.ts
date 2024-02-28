// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const headers = request.headers;
    // check if it's in iframe
    const isIframe =
        headers.get("x-requested-with") === "XMLHttpRequest" ||
        headers.get("sec-fetch-dest") === "iframe";
    if (!isIframe) {
        return new NextResponse(
            "Sorry! Can only use this route as an iframe src",
            { status: 400, headers: { "content-type": "application/json" } }
        );
    }
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: "/embed/:path*",
};

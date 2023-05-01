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
        // You can also set request headers in NextResponse.rewrite
        return new NextResponse(
            "Sorry! Can only use this route as an iframe src",
            { status: 401, headers: { "content-type": "application/json" } }
        );
    }
    // return NextResponse.redirect(new URL("/about-2", request.url));
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: "/embed/:path*",
};

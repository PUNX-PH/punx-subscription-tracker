import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    // Simple bypass middleware while we migrate/dev with Firebase
    // Firebase Auth runs mostly client-side, so server middleware is less critical for session refresh
    // but can be used for route protection if verification is needed (via Admin SDK)

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

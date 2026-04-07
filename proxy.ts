export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/ideas/:path*",
    "/api/categories/:path*",
    "/api/process-idea/:path*",
  ],
};

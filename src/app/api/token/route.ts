import { admit } from "@/lib/server/admission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = admit;
export const GET = admit;
export const PUT = admit;
export const PATCH = admit;
export const DELETE = admit;
export const OPTIONS = admit;
export const HEAD = admit;

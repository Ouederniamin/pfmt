import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Check if the current user has the admin role.
 * Returns null if admin, or a NextResponse with 401/403 if not.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const user = await currentUser();
  const role = (user?.publicMetadata as { role?: string })?.role;

  if (role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  return null;
}

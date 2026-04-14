import { requireAdmin } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const client = await clerkClient();
  const users = await client.users.getUserList({ limit: 100, orderBy: "-created_at" });

  const mapped = users.data.map((u) => {
    const meta = u.publicMetadata as Record<string, unknown>;
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: u.imageUrl,
      role: (meta?.role as string) ?? "student",
      createdAt: u.createdAt,
    };
  });

  return NextResponse.json({ users: mapped, totalCount: users.totalCount });
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();
  const { userId, role } = body as { userId?: string; role?: string };

  if (!userId || !role || !["admin", "student"].includes(role)) {
    return NextResponse.json({ error: "userId et role (admin | student) requis." }, { status: 400 });
  }

  const client = await clerkClient();
  const existingUser = await client.users.getUser(userId);
  const existingMeta = (existingUser.publicMetadata ?? {}) as Record<string, unknown>;
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { ...existingMeta, role },
  });

  return NextResponse.json({ success: true });
}

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  /** Private demo account from "Try the demo". */
  isGuest: boolean;
}

/** Session → user row, once per request. Redirects to /login when signed out. */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, isGuest: true } });
  if (!user) redirect("/login");
  return user;
});

import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Login and sign-up pages: people already signed in to a real account go straight to the app.
 * Demo (guest) visitors stay, so they can sign up and keep their work, or sign in to their own account.
 */
export async function redirectSignedInUsers() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return;
  const user = await prisma.user.findUnique({ where: { id }, select: { isGuest: true } });
  if (user && !user.isGuest) redirect("/dashboard");
}

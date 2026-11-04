"use server";

import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { seedSamples } from "@/lib/data/properties";
import { loginSchema, registerSchema } from "@/lib/validation/deal";

export type AuthFormState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;

async function credentialsSignIn(email: string, password: string, redirectTo = "/dashboard"): Promise<AuthFormState> {
  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    // signIn() throws a redirect on success — let Next.js handle it.
    if (error instanceof AuthError) return { error: "Invalid email or password." };
    throw error;
  }
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  return credentialsSignIn(parsed.data.email, parsed.data.password);
}

/** Private demo accounts are removed after this many days unless the visitor signs up. */
const GUEST_DAYS = 3;

/**
 * "Try the demo": a fresh private account with the sample deals, so visitors never see
 * or change each other's work. Signing up later keeps everything (see registerAction).
 */
export async function demoLoginAction(): Promise<AuthFormState> {
  // Housekeeping: drop expired demo accounts (their deals cascade).
  await prisma.user.deleteMany({ where: { isGuest: true, createdAt: { lt: new Date(Date.now() - GUEST_DAYS * 86_400_000) } } });
  const email = `guest-${randomUUID()}@guest.dealan.invalid`;
  const password = randomBytes(24).toString("base64url");
  const user = await prisma.user.create({
    data: { name: "Demo investor", email, isGuest: true, passwordHash: await bcrypt.hash(password, 10), settings: { create: {} } },
  });
  await seedSamples(user.id);
  return credentialsSignIn(email, password);
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { fieldErrors: { email: ["An account with this email already exists."] } };

  // Signing up from a demo: turn that account into the real one so the deals made in the demo are kept.
  const session = await auth();
  const current = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, isGuest: true } }) : null;
  if (current?.isGuest) {
    await prisma.user.update({
      where: { id: current.id },
      data: { name, email, passwordHash: await bcrypt.hash(password, 12), isGuest: false },
    });
    return credentialsSignIn(email, password);
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12), settings: { create: {} } },
  });
  // New accounts start with clearly labelled sample deals; they can be removed in Settings.
  await seedSamples(user.id);

  return credentialsSignIn(email, password);
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

/** Form action for "Try the demo" buttons outside the login page. */
export async function startDemoAction(): Promise<void> {
  await demoLoginAction();
}

"use server";

import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { auth, signIn, signOut } from "@/auth";
import { ATTRIBUTION_COOKIE, attributionData, parseAttribution } from "@/lib/attribution";
import { queueAnalyticsEvent } from "@/lib/analytics-events";
import { GUEST_DAYS } from "@/lib/demo";
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


/**
 * "Try the demo": a fresh private account with the sample deals, so visitors never see
 * or change each other's work. Signing up later keeps everything (see registerAction).
 */
export async function demoLoginAction(): Promise<AuthFormState> {
  // Housekeeping: drop expired demo accounts (their deals cascade).
  await prisma.user.deleteMany({ where: { isGuest: true, createdAt: { lt: new Date(Date.now() - GUEST_DAYS * 86_400_000) } } });
  const email = `guest-${randomUUID()}@guest.dealan.invalid`;
  const password = randomBytes(24).toString("base64url");
  const attribution = parseAttribution((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
  const user = await prisma.user.create({
    data: {
      name: "Demo investor",
      email,
      isGuest: true,
      passwordHash: await bcrypt.hash(password, 10),
      settings: { create: {} },
      ...attributionData(attribution),
    },
  });
  await seedSamples(user.id);
  await prisma.demoSession.create({
    data: {
      userId: user.id,
      source: attribution?.source ?? null,
      medium: attribution?.medium ?? null,
      campaign: attribution?.campaign ?? null,
      landing: attribution?.landing ?? null,
      referrer: attribution?.referrer ?? null,
    },
  });
  await queueAnalyticsEvent("demo_start");
  return credentialsSignIn(email, password);
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { fieldErrors: { email: ["An account with this email already exists."] } };

  const attribution = parseAttribution((await cookies()).get(ATTRIBUTION_COOKIE)?.value);

  // Signing up from a demo: turn that account into the real one so the deals made in the demo are kept.
  const session = await auth();
  const current = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, isGuest: true, signupSource: true, signupLanding: true } })
    : null;
  if (current?.isGuest) {
    // The demo already recorded where they came from; fill it in only if it didn't.
    const keep = current.signupSource || current.signupLanding;
    await prisma.user.update({
      where: { id: current.id },
      data: { name, email, passwordHash: await bcrypt.hash(password, 12), isGuest: false, ...(keep ? {} : attributionData(attribution)) },
    });
    await prisma.demoSession.updateMany({ where: { userId: current.id, signedUpAt: null }, data: { signedUpAt: new Date() } });
    await queueAnalyticsEvent("sign_up");
    return credentialsSignIn(email, password);
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12), settings: { create: {} }, ...attributionData(attribution) },
  });
  // New accounts start with clearly labelled sample deals; they can be removed in Settings.
  await seedSamples(user.id);
  await queueAnalyticsEvent("sign_up");

  return credentialsSignIn(email, password);
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

/** Form action for "Try the demo" buttons outside the login page. */
export async function startDemoAction(): Promise<void> {
  await demoLoginAction();
}

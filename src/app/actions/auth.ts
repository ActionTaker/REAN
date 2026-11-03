"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
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

export async function demoLoginAction(): Promise<AuthFormState> {
  return credentialsSignIn("demo@dealan.app", "demo1234");
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { fieldErrors: { email: ["An account with this email already exists."] } };

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

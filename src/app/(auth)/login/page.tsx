import type { Metadata } from "next";
import { LoginForm } from "../auth-forms";
import { redirectSignedInUsers } from "@/lib/redirect-signed-in";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  await redirectSignedInUsers();
  return <LoginForm />;
}

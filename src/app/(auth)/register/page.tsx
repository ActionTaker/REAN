import type { Metadata } from "next";
import { RegisterForm } from "../auth-forms";
import { redirectSignedInUsers } from "@/lib/redirect-signed-in";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  await redirectSignedInUsers();
  return <RegisterForm />;
}

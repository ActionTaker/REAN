"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { demoLoginAction, loginAction, registerAction, type AuthFormState } from "@/app/actions/auth";

function FieldBlock({ name, label, type = "text", autoComplete, state }: {
  name: string; label: string; type?: string; autoComplete?: string; state: AuthFormState;
}) {
  const err = state?.fieldErrors?.[name]?.[0];
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} autoComplete={autoComplete} aria-invalid={!!err} required />
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

function DemoButton() {
  const [, action, pending] = useActionState(demoLoginAction, undefined);
  return (
    <form action={action}>
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Explore the demo account
      </Button>
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back. Pick up where you left off.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="space-y-4">
          <FieldBlock name="email" label="Email" type="email" autoComplete="email" state={state} />
          <FieldBlock name="password" label="Password" type="password" autoComplete="current-password" state={state} />
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Sign in
          </Button>
        </form>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Separator className="flex-1" /> or <Separator className="flex-1" />
        </div>
        <DemoButton />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        New to DEALAN?&nbsp;<Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">Create an account</Link>
      </CardFooter>
    </Card>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start analyzing rental properties in minutes. Sample deals are included so you can explore.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <FieldBlock name="name" label="Name" autoComplete="name" state={state} />
          <FieldBlock name="email" label="Email" type="email" autoComplete="email" state={state} />
          <FieldBlock name="password" label="Password" type="password" autoComplete="new-password" state={state} />
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Create account
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Already have an account?&nbsp;<Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Sign in</Link>
      </CardFooter>
    </Card>
  );
}

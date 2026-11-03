import { Brand } from "@/components/shell/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Brand href="/" />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

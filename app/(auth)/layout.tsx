import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/25 via-primary/5 to-transparent"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={72}
            height={72}
            priority
            className="mb-4 rounded-[20px] shadow-lg shadow-primary/30"
          />
          <h1 className="text-3xl font-bold tracking-tight">Routine</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu painel de consistência diária
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

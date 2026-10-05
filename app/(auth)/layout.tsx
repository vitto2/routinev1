export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Routine</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu painel de consistência diária
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

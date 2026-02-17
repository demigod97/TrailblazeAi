export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-3">
        <h1 className="text-lg font-semibold">TrailBlazeAI Dashboard</h1>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold">Clinic POS</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Clinic Point of Sale System
        </p>
        <Link
          href="/login"
          className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Sign In
        </Link>
      </main>
    </div>
  );
}

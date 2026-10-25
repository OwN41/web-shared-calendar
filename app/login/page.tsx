import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { ErrorBanner, btnCls, cardCls, inputCls } from "@/components/ui";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/calendar");
  const { error } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form action={login} className={`${cardCls} w-full max-w-sm space-y-4`}>
        <h1 className="text-xl font-semibold">Log in</h1>
        <ErrorBanner message={typeof error === "string" ? error : undefined} />
        <input name="email" type="email" required autoComplete="email" placeholder="Email" className={inputCls} />
        <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className={inputCls} />
        <button className={`${btnCls} w-full`}>Log in</button>
        <p className="text-center text-sm">
          No account? <Link href="/register" className="text-blue-600">Register</Link>
        </p>
      </form>
    </main>
  );
}

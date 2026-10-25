import Link from "next/link";
import { redirect } from "next/navigation";
import { register } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { ErrorBanner, btnCls, cardCls, inputCls } from "@/components/ui";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  if (await getCurrentUser()) redirect("/calendar");
  const { error } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form action={register} className={`${cardCls} w-full max-w-sm space-y-4`}>
        <h1 className="text-xl font-semibold">Create account</h1>
        <ErrorBanner message={typeof error === "string" ? error : undefined} />
        <input name="name" required maxLength={80} autoComplete="name" placeholder="Your name" className={inputCls} />
        <input name="email" type="email" required autoComplete="email" placeholder="Email" className={inputCls} />
        <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Password (min. 8 characters)" className={inputCls} />
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="Confirm password" className={inputCls} />
        <label className="flex items-center justify-between text-sm">
          Your calendar colour
          <input name="color" type="color" defaultValue="#3b82f6" className="h-8 w-12 cursor-pointer" />
        </label>
        <button className={`${btnCls} w-full`}>Register</button>
        <p className="text-center text-sm">
          Already registered? <Link href="/login" className="text-blue-600">Log in</Link>
        </p>
      </form>
    </main>
  );
}

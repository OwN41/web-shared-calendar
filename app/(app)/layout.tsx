import { Nav } from "@/components/Nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</main>
    </>
  );
}

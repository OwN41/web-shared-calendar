import { Nav } from "@/components/Nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Nav user={user} />
      <main className="w-full flex-1 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-8 lg:px-12 lg:pt-6">{children}</main>
    </>
  );
}

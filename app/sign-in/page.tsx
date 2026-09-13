import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { AuthCard } from "@/app/components/AuthCard";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect?: string }>;
}) {
  const session = await getCurrentSession();
  const params = await searchParams;
  const targetRedirect = params?.redirect || "/tracker";

  if (session) {
    redirect(targetRedirect);
  }

  return (
    <main className="relative flex min-h-[calc(100vh-65px)] w-full items-center justify-center overflow-hidden bg-[#0c1410] px-4 py-8 text-[#e6eee5]">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[38rem] w-[38rem] rounded-full bg-emerald-900/15 blur-[140px]" />
        <div className="absolute -right-28 top-[-9rem] h-[28rem] w-[28rem] rounded-full border-[42px] border-[#1c3026] opacity-40" />
        <div className="absolute -bottom-48 -left-32 h-[32rem] w-[32rem] rounded-full border-[56px] border-[#17271f] opacity-50" />
      </div>

      <AuthCard />
    </main>
  );
}
import { AnnouncementTicker, BackToHome, SiteFooter } from "@/components/shared/site-chrome";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex min-h-screen flex-col bg-white text-black">
    <AnnouncementTicker />
    <BackToHome />
    <main className="min-h-screen flex-1 pt-[75px]">{children}</main>
    <SiteFooter />
  </div>;
}

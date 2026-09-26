import { AnnouncementTicker, SiteFooter } from "@/components/shared/site-chrome";
import { SiteBackLink } from "@/components/shared/site-back-link";
import { getPublicShop } from "@/lib/shop/public";

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { announcementEnabled } = await getPublicShop();
  return <div className="besties-site flex min-h-screen flex-col bg-background text-foreground">
    <AnnouncementTicker />
    <SiteBackLink tickerVisible={announcementEnabled} />
    <main className={`min-h-screen flex-1 ${announcementEnabled ? "pt-[75px]" : "pt-0"}`}>{children}</main>
    <SiteFooter />
  </div>;
}

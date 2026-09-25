import { AnnouncementTicker, SiteFooter } from "@/components/shared/site-chrome";
import { SiteBackLink } from "@/components/shared/site-back-link";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="besties-site flex min-h-screen flex-col bg-background text-foreground">
    <AnnouncementTicker />
    <SiteBackLink />
    <main className="min-h-screen flex-1 pt-[75px]">{children}</main>
    <SiteFooter />
  </div>;
}

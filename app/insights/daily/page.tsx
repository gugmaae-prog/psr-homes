import DailyMarketDesk from "@/components/DailyMarketDesk";
import { PsrPageShell } from "@/components/PsrPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Daily Dubai Real Estate Market Insight",
  "A current, evidence-led daily reading of Dubai real estate releases, opportunities and buyer decision checks from PSR.",
  "/insights/daily",
);

export default function DailyInsightsPage() {
  return <PsrPageShell className="daily-insights-page" insightsSection="daily">
    <DailyMarketDesk />
  </PsrPageShell>;
}

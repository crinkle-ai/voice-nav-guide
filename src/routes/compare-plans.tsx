import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { useTrackPage } from "@/context/AppContext";

export const Route = createFileRoute("/compare-plans")({
  head: () => ({
    meta: [
      { title: "Compare Plans — Medicare Navigator" },
      { name: "description", content: "Compare Medicare plans side-by-side." },
    ],
  }),
  component: ComparePlans,
});

function ComparePlans() {
  useTrackPage("plan-comparison", "/compare-plans");
  return (
    <PagePlaceholder
      title="Compare Plans"
      description="See your Medicare options side-by-side — premiums, coverage, and out-of-pocket costs."
      comingNext="Plan comparison table with filters for premium, deductible, drug coverage, and provider network."
    />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { useTrackPage } from "@/context/AppContext";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn Medicare — Medicare Navigator" },
      { name: "description", content: "Understand Medicare Parts A, B, C, and D in plain language." },
    ],
  }),
  component: Learn,
});

function Learn() {
  useTrackPage("education", "/learn");
  return (
    <PagePlaceholder
      title="Medicare Education"
      description="Plain-language explanations of Parts A, B, C, and D — at your own pace."
      comingNext="Interactive lessons, glossary terms, and voice-narrated walkthroughs of each Medicare part."
    />
  );
}

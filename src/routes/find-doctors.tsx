import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { useTrackPage } from "@/context/AppContext";

export const Route = createFileRoute("/find-doctors")({
  head: () => ({
    meta: [
      { title: "Find Doctors — Medicare Navigator" },
      { name: "description", content: "Search for doctors and check Medicare acceptance." },
    ],
  }),
  component: FindDoctors,
});

function FindDoctors() {
  useTrackPage("doctor-lookup", "/find-doctors");
  return (
    <PagePlaceholder
      title="Find Doctors"
      description="Search for your providers and confirm they accept the plans you're considering."
      comingNext="Doctor search by name, location, or specialty with Medicare network filters."
    />
  );
}

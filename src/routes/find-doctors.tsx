import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchDoctors } from "@/lib/catalog.functions";
import { useApp, useTrackPage, useHighlightConsumer } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MapPin, Phone, Search, Sparkles, Stethoscope, Plane, Filter as FilterIcon } from "lucide-react";
import { persona } from "@/mock/personas";

export const Route = createFileRoute("/find-doctors")({
  head: () => ({
    meta: [
      { title: "Find Doctors — Medicare Navigator" },
      { name: "description", content: "Search Medicare-accepting doctors by name, specialty, and city." },
    ],
  }),
  component: FindDoctors,
});

const SPECIALTIES = ["All", "Primary Care", "Cardiology", "Orthopedics", "Endocrinology", "Ophthalmology", "Neurology", "Dermatology"];

function FindDoctors() {
  useTrackPage("doctor-lookup", "/find-doctors");
  useHighlightConsumer();
  const { state, dispatch } = useApp();
  const fetchDoctors = useServerFn(searchDoctors);

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [city, setCity] = useState("");
  const [filters, setFilters] = useState<{ name?: string; specialty?: string; city?: string }>({});

  const { data, isLoading } = useQuery({
    queryKey: ["doctors", filters],
    queryFn: () => fetchDoctors({ data: filters }),
  });

  // Voice agent can pre-fill filters via context.
  useEffect(() => {
    const vf = state.doctorVoiceFilters;
    if (!vf) return;
    if (vf.name !== undefined) setName(vf.name ?? "");
    if (vf.specialty !== undefined) setSpecialty(vf.specialty || "All");
    if (vf.city !== undefined) setCity(vf.city ?? "");
    setFilters({
      name: vf.name?.trim() || undefined,
      specialty: vf.specialty && vf.specialty !== "All" ? vf.specialty : undefined,
      city: vf.city?.trim() || undefined,
    });
    dispatch({ type: "SET_DOCTOR_VOICE_FILTERS", filters: null });
  }, [state.doctorVoiceFilters, dispatch]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({
      name: name.trim() || undefined,
      specialty: specialty === "All" ? undefined : specialty,
      city: city.trim() || undefined,
    });
  };

  const runQuickSearch = (next: { name?: string; specialty?: string; city?: string }) => {
    setName(next.name ?? "");
    setSpecialty(next.specialty ?? "All");
    setCity(next.city ?? "");
    setFilters({
      name: next.name?.trim() || undefined,
      specialty: next.specialty && next.specialty !== "All" ? next.specialty : undefined,
      city: next.city?.trim() || undefined,
    });
    if (typeof window !== "undefined") {
      setTimeout(() => document.getElementById("doctor-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };

  const doctorNeeds = persona.needs.filter((n) => n.icon === "stethoscope" || n.icon === "plane");
  const networkFilters = persona.planFilters.filter((f) => /network|state|ppo/i.test(f.label));
  const quickSearches = [
    { label: "Primary Care in Minneapolis", specialty: "Primary Care", city: "Minneapolis" },
    { label: "Cardiology in Minneapolis", specialty: "Cardiology", city: "Minneapolis" },
    { label: "Primary Care in Phoenix", specialty: "Primary Care", city: "Phoenix" },
  ];

  const doctors = data?.doctors ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Find your doctors</h1>
      <p className="mt-4 text-xl text-muted-foreground">
        Search by name, specialty, or city. We'll show who's accepting new patients and who accepts Medicare assignment.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-primary-soft/30 p-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-accent-foreground">
          <Sparkles className="h-3 w-3" /> Here's what you told us
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground">
          You want to keep Dr. Patel and Dr. Chen, and you need coverage that follows you between Minnesota and Arizona.
        </p>

        {persona.doctors.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Doctors you want to keep</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {persona.doctors.map((d) => (
                <div key={d.id} className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-primary shrink-0" />
                      <div className="truncate text-sm font-semibold text-foreground">{d.name}</div>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{d.specialty} · {d.location}</div>
                    <div className="mt-2">
                      <span className={[
                        "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest",
                        d.status === "in-network" ? "bg-success-soft text-foreground" : "bg-warm-soft text-warm-foreground",
                      ].join(" ")}>
                        {d.status.replace("-", " ")}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => runQuickSearch({ name: d.name.replace(/^Dr\.\s*/, ""), specialty: d.specialty })}
                  >
                    Find
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(doctorNeeds.length > 0 || networkFilters.length > 0) && (
          <div className="mt-5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">What matters in a doctor</div>
            <ul className="flex flex-wrap gap-2">
              {doctorNeeds.map((n) => (
                <li key={n.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground">
                  {n.icon === "plane" ? <Plane className="h-3 w-3 text-primary" /> : <Stethoscope className="h-3 w-3 text-primary" />}
                  {n.label}
                </li>
              ))}
              {networkFilters.map((f) => (
                <li key={f.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground">
                  <FilterIcon className="h-3 w-3 text-primary" />
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Quick searches</div>
          <div className="flex flex-wrap gap-2">
            {quickSearches.map((q) => (
              <Button key={q.label} size="sm" variant="secondary" onClick={() => runQuickSearch({ specialty: q.specialty, city: q.city })}>
                {q.label}
              </Button>
            ))}
          </div>
        </div>
      </section>


      <form id="doctor-search" onSubmit={onSearch} className="mt-8 grid gap-3 rounded-xl border bg-card p-5 md:grid-cols-[1fr_1fr_1fr_auto]">
        <Input placeholder="Doctor name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" />
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
          <SelectContent>{SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="h-12 text-base" />
        <Button type="submit" size="lg" className="h-12 px-6"><Search className="h-4 w-4" /> Search</Button>
      </form>

      <section id="doctor-results" className="mt-8 space-y-4">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        {!isLoading && doctors.length === 0 && (
          <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center text-muted-foreground">
            No doctors match those filters. Try clearing one.
          </div>
        )}
        {doctors.map((d) => {
          const saved = state.savedDoctorIds.includes(d.id);
          return (
            <article key={d.id} id={`doctor-${d.id}`} className="flex flex-col gap-3 rounded-xl border bg-card p-5 scroll-mt-24 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-foreground">{d.name}</h3>
                <p className="text-muted-foreground">{d.specialty}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {d.address}, {d.city}, {d.state} {d.zip}</span>
                  <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" /> {d.phone}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {d.medicare_assignment && <Badge variant="secondary">Accepts Medicare assignment</Badge>}
                  {d.accepting_new_patients ? <Badge>Accepting new patients</Badge> : <Badge variant="outline">Not accepting new patients</Badge>}
                  {d.languages?.map((l: string) => <Badge key={l} variant="outline">{l}</Badge>)}
                </div>
              </div>
              <Button
                variant={saved ? "default" : "outline"}
                onClick={() => dispatch({ type: "TOGGLE_SAVED_DOCTOR", id: d.id })}
                className="shrink-0"
              >
                <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
                {saved ? "Saved" : "Save"}
              </Button>
            </article>
          );
        })}
      </section>
    </main>
  );
}

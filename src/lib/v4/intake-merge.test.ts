import { describe, it, expect } from "vitest";
import { normalizeDoctorName, doctorKey, mergeDoctors } from "./intake-merge";
import type { DoctorEntry, NpiVerification } from "@/lib/v3/intake-types";

function npi(selectedNpi: string): NpiVerification {
  return {
    status: "verified",
    checkedAt: "2026-01-01T00:00:00Z",
    matches: [],
    selectedNpi,
  };
}

function doc(name: string, extra: Partial<DoctorEntry> = {}): DoctorEntry {
  return { name, verification: "unverified", ...extra };
}

describe("normalizeDoctorName", () => {
  it("strips honorifics", () => {
    expect(normalizeDoctorName("Dr. Robert Bruley")).toBe("robert bruley");
    expect(normalizeDoctorName("Doctor Robert Bruley")).toBe("robert bruley");
    expect(normalizeDoctorName("Prof. Jane Smith")).toBe("jane smith");
  });

  it("strips credential suffixes", () => {
    expect(normalizeDoctorName("Robert Bruley, MD")).toBe("robert bruley");
    expect(normalizeDoctorName("Robert Bruley MD")).toBe("robert bruley");
    expect(normalizeDoctorName("Jane Smith, DO")).toBe("jane smith");
    expect(normalizeDoctorName("Sam Doe, PhD")).toBe("sam doe");
  });

  it("strips both honorific and suffix together", () => {
    expect(normalizeDoctorName("Dr. Robert Bruley, MD")).toBe("robert bruley");
    expect(normalizeDoctorName("DR ROBERT BRULEY, MD")).toBe("robert bruley");
  });

  it("collapses whitespace and case", () => {
    expect(normalizeDoctorName("  Robert   Bruley  ")).toBe("robert bruley");
    expect(normalizeDoctorName("ROBERT BRULEY")).toBe("robert bruley");
  });
});

describe("doctorKey", () => {
  it("prefers NPI when verified", () => {
    expect(doctorKey(doc("Dr. Robert Bruley, MD", { npiVerification: npi("1841403912") }))).toBe(
      "npi:1841403912",
    );
  });
  it("falls back to normalized name when unverified", () => {
    expect(doctorKey(doc("Dr. Robert Bruley, MD"))).toBe("name:robert bruley");
    expect(doctorKey(doc("Robert Bruley"))).toBe("name:robert bruley");
  });
});

describe("mergeDoctors", () => {
  const empty = { value: [] as DoctorEntry[], confidence: "missing" as const };

  it("dedupes name variants of the same doctor", () => {
    const merged = mergeDoctors(empty, {
      value: [
        doc("Dr. Robert Bruley, MD"),
        doc("Dr. Robert Bruley"),
        doc("Robert Bruley"),
      ],
      confidence: "captured",
    });
    expect(merged.value).toHaveLength(1);
    expect(normalizeDoctorName(merged.value[0].name)).toBe("robert bruley");
  });

  it("collapses unverified name-only entries into the NPI-verified entry", () => {
    const prior = {
      value: [doc("Dr. Robert Bruley, MD"), doc("Robert Bruley")],
      confidence: "needs_confirmation" as const,
    };
    const next = {
      value: [doc("Dr. Robert Bruley, MD", { npiVerification: npi("1841403912") })],
      confidence: "captured" as const,
    };
    const merged = mergeDoctors(prior, next);
    expect(merged.value).toHaveLength(1);
    expect(merged.value[0].npiVerification?.selectedNpi).toBe("1841403912");
  });

  it("collapses two entries that share an NPI even with different name strings", () => {
    const merged = mergeDoctors(empty, {
      value: [
        doc("Dr. Robert Bruley, MD", {
          npiVerification: npi("1841403912"),
          clinic: "Park Nicollet",
        }),
        doc("Robert Bruley", { npiVerification: npi("1841403912"), specialty: "Internal Medicine" }),
      ],
      confidence: "captured",
    });
    expect(merged.value).toHaveLength(1);
    expect(merged.value[0].clinic).toBe("Park Nicollet");
    expect(merged.value[0].specialty).toBe("Internal Medicine");
  });

  it("keeps two genuinely different doctors", () => {
    const merged = mergeDoctors(empty, {
      value: [doc("Dr. Robert Bruley, MD"), doc("Dr. Jane Smith, DO")],
      confidence: "captured",
    });
    expect(merged.value).toHaveLength(2);
  });

  it("is idempotent across repeated merges (duplicates don't reappear)", () => {
    const first = mergeDoctors(empty, {
      value: [doc("Dr. Robert Bruley, MD", { npiVerification: npi("1841403912") })],
      confidence: "captured",
    });
    const second = mergeDoctors(first, {
      value: [doc("Robert Bruley"), doc("Dr. Robert Bruley, MD")],
      confidence: "needs_confirmation",
    });
    expect(second.value).toHaveLength(1);
    expect(second.value[0].npiVerification?.selectedNpi).toBe("1841403912");

    const third = mergeDoctors(second, { value: [doc("Dr. Robert Bruley")], confidence: "captured" });
    expect(third.value).toHaveLength(1);
  });
});

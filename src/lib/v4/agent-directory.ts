import type { PermanentAgent } from "@/lib/v4/session-store";
import sarahAvatar from "@/assets/agent-sarah.jpg";

export type AgentAvailability = "available" | "soon" | "busy";

export type DirectoryAgent = PermanentAgent & {
  id: string;
  availability: AgentAvailability;
  availabilityLabel: string;
  specialty: string;
};

// Photographic headshots via pravatar.cc — deterministic by image index.
const p = (n: number) => `https://i.pravatar.cc/240?img=${n}`;

export const AGENT_DIRECTORY: DirectoryAgent[] = [
  {
    id: "sarah-chen",
    name: "Sarah Chen",
    title: "Licensed Medicare Advisor",
    npn: "NPN #19284756",
    location: "Edina, MN",
    avatar: sarahAvatar,
    facts: [
      "Lives in Edina with her golden retriever, Cooper",
      "Spends summer weekends fly-fishing on Lake Mille Lacs",
    ],
    availability: "available",
    availabilityLabel: "Available now",
    specialty: "Great with prescription questions",
  },
  {
    id: "michael-rodriguez",
    name: "Michael Rodriguez",
    title: "Licensed Medicare Specialist",
    npn: "NPN #20451873",
    location: "Minneapolis, MN",
    avatar: p(12),
    facts: [
      "Speaks English and Spanish fluently",
      "Coffee enthusiast and proud grandfather of four",
    ],
    availability: "available",
    availabilityLabel: "Available now",
    specialty: "Specializes in first-time Medicare shoppers",
  },
  {
    id: "emily-johnson",
    name: "Emily Johnson",
    title: "Medicare Sales Representative",
    npn: "NPN #18762345",
    location: "St. Paul, MN",
    avatar: p(45),
    facts: [
      "Former registered nurse with 15 years of bedside experience",
      "Volunteers weekly at a local senior center",
    ],
    availability: "soon",
    availabilityLabel: "Available in 5 minutes",
    specialty: "Experience with chronic conditions",
  },
  {
    id: "james-patel",
    name: "James Patel",
    title: "Licensed Medicare Advisor",
    npn: "NPN #21098456",
    location: "Rochester, MN",
    avatar: p(33),
    facts: [
      "Avid hiker — has visited every Minnesota state park",
      "Passionate about explaining complex topics simply",
    ],
    availability: "available",
    availabilityLabel: "Available now",
    specialty: "Helps compare Advantage and Supplement plans",
  },
  {
    id: "karen-olson",
    name: "Karen Olson",
    title: "Licensed Medicare Specialist",
    npn: "NPN #17654329",
    location: "Edina, MN",
    avatar: p(47),
    facts: [
      "Lifelong Minnesota Twins fan with season tickets",
      "Enjoys gardening heirloom tomatoes every summer",
    ],
    availability: "busy",
    availabilityLabel: "Busy until 2:30 PM",
    specialty: "Highly rated for explaining complex topics simply",
  },
  {
    id: "david-nguyen",
    name: "David Nguyen",
    title: "Medicare Sales Representative",
    npn: "NPN #22087641",
    location: "Bloomington, MN",
    avatar: p(15),
    facts: [
      "Speaks English and Vietnamese",
      "Runs the Twin Cities Marathon every fall",
    ],
    availability: "available",
    availabilityLabel: "Available now",
    specialty: "Specializes in dual-eligible (D-SNP) plans",
  },
  {
    id: "lisa-thompson",
    name: "Lisa Thompson",
    title: "Licensed Medicare Advisor",
    npn: "NPN #19834521",
    location: "Duluth, MN",
    avatar: p(36),
    facts: [
      "Lives on the North Shore with her rescue beagle",
      "Loves Lake Superior sunrises and kayaking",
    ],
    availability: "soon",
    availabilityLabel: "Available this afternoon",
    specialty: "Great with travel and snowbird coverage",
  },
  {
    id: "robert-kim",
    name: "Robert Kim",
    title: "Licensed Medicare Specialist",
    npn: "NPN #20984512",
    location: "Eden Prairie, MN",
    avatar: p(60),
    facts: [
      "Speaks English and Korean",
      "Brews his own kombucha on weekends",
    ],
    availability: "available",
    availabilityLabel: "Available now",
    specialty: "Specializes in prescription drug plans (PDP)",
  },
  {
    id: "angela-brooks",
    name: "Angela Brooks",
    title: "Medicare Sales Representative",
    npn: "NPN #18345672",
    location: "St. Paul, MN",
    avatar: p(49),
    facts: [
      "Sings in her church choir every Sunday",
      "Passionate about helping families navigate Medicare together",
    ],
    availability: "available",
    availabilityLabel: "Available now",
    specialty: "Specializes in spousal coordination",
  },
  {
    id: "thomas-miller",
    name: "Thomas Miller",
    title: "Licensed Medicare Advisor",
    npn: "NPN #17298456",
    location: "Maple Grove, MN",
    avatar: p(53),
    facts: [
      "Retired Air Force veteran, proud grandfather of six",
      "Restores vintage Ford pickups in his garage",
    ],
    availability: "busy",
    availabilityLabel: "Busy until 3:00 PM",
    specialty: "Specializes in veterans' benefit coordination",
  },
];

export function findAgent(id: string | undefined): DirectoryAgent | undefined {
  if (!id) return undefined;
  return AGENT_DIRECTORY.find((a) => a.id === id);
}

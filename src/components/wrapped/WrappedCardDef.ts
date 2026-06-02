import { ActivityCard } from "./cards/ActivityCard";
import { CoverCard } from "./cards/CoverCard";
import { HoursCard } from "./cards/HoursCard";
import { MoodCard } from "./cards/MoodCard";
import { PeopleCard } from "./cards/PeopleCard";
import { PersonalityCard } from "./cards/PersonalityCard";
import { StreaksCard } from "./cards/StreaksCard";
import { TotalCard } from "./cards/TotalCard";
import { WordsCard } from "./cards/WordsCard";
import type { WrappedCardDef } from "./WrappedCards";

export const WRAPPED_CARDS: WrappedCardDef[] = [
  {
    id: "cover",
    label: "Intro",
    eyebrow: "Discord Wrapped",
    accent: "#d8b4fe",
    gradient: "linear-gradient(160deg, #7c3aed 0%, #4338ca 45%, #1e1b4b 100%)",
    Component: CoverCard,
  },
  {
    id: "messages",
    label: "Messages",
    eyebrow: "Messages sent",
    accent: "#c7d2fe",
    gradient: "linear-gradient(160deg, #4f46e5 0%, #312e81 50%, #0f0d2b 100%)",
    Component: TotalCard,
  },
  {
    id: "hours",
    label: "Active Hours",
    eyebrow: "When you show up",
    accent: "#67e8f9",
    gradient: "linear-gradient(160deg, #0891b2 0%, #155e75 50%, #08233a 100%)",
    Component: HoursCard,
  },
  {
    id: "people",
    label: "Your People",
    eyebrow: "Your people",
    accent: "#f9a8d4",
    gradient: "linear-gradient(160deg, #be185d 0%, #86198f 50%, #2e1065 100%)",
    Component: PeopleCard,
  },
  {
    id: "words",
    label: "Top Words",
    eyebrow: "Words you live by",
    accent: "#fde68a",
    gradient: "linear-gradient(160deg, #ea580c 0%, #b91c5c 50%, #3b0764 100%)",
    Component: WordsCard,
    enabled: (s) => s.topWords.length > 0,
  },
  {
    id: "streak",
    label: "Streak",
    eyebrow: "On a roll",
    accent: "#6ee7b7",
    gradient: "linear-gradient(160deg, #059669 0%, #047857 50%, #022c22 100%)",
    Component: StreaksCard,
  },
  {
    id: "mood",
    label: "The Vibe",
    eyebrow: "The vibe",
    accent: "#fde68a",
    gradient: "linear-gradient(160deg, #d97706 0%, #047857 55%, #064e3b 100%)",
    Component: MoodCard,
    enabled: (s) => s.sentiment !== null,
  },
  {
    id: "activity",
    label: "Beyond Chat",
    eyebrow: "Beyond the chat",
    accent: "#93c5fd",
    gradient: "linear-gradient(160deg, #4f46e5 0%, #0284c7 55%, #082f49 100%)",
    Component: ActivityCard,
  },
  {
    id: "personality",
    label: "Personality",
    eyebrow: "Your Discord personality",
    accent: "#e9d5ff",
    gradient: "linear-gradient(160deg, #7c3aed 0%, #be185d 55%, #1e1b4b 100%)",
    Component: PersonalityCard,
  },
];
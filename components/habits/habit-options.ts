import {
  Apple,
  Bike,
  BookOpen,
  Brain,
  Code,
  Droplets,
  Dumbbell,
  Footprints,
  Heart,
  Leaf,
  Moon,
  Music,
  PenLine,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";

export const HABIT_ICONS: Record<string, { Icon: LucideIcon; label: string }> = {
  book: { Icon: BookOpen, label: "Book" },
  dumbbell: { Icon: Dumbbell, label: "Weights" },
  run: { Icon: Footprints, label: "Walk or run" },
  bike: { Icon: Bike, label: "Bike" },
  water: { Icon: Droplets, label: "Water" },
  moon: { Icon: Moon, label: "Sleep" },
  mind: { Icon: Brain, label: "Mind" },
  write: { Icon: PenLine, label: "Write" },
  code: { Icon: Code, label: "Code" },
  music: { Icon: Music, label: "Music" },
  food: { Icon: Apple, label: "Food" },
  leaf: { Icon: Leaf, label: "Nature" },
  sun: { Icon: Sun, label: "Morning" },
  heart: { Icon: Heart, label: "Heart" },
  spark: { Icon: Sparkles, label: "Other" },
};

export const HABIT_COLORS: { value: string; label: string }[] = [
  { value: "#E5383B", label: "Red" },
  { value: "#F77F00", label: "Orange" },
  { value: "#F2B705", label: "Yellow" },
  { value: "#2FB344", label: "Green" },
  { value: "#2F80ED", label: "Blue" },
  { value: "#8E44EC", label: "Purple" },
  { value: "#E83E8C", label: "Pink" },
];

export const STARTER_HABITS = [
  "Read 20 minutes",
  "Move for 30 minutes",
  "Drink water",
  "Write a page",
];

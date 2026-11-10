import { Suspense } from "react";
import { HabitDetail } from "@/components/habits/habit-detail";

export const metadata = { title: "Habit" };

// Habits live in the browser, so the detail view reads the id from the query string (?id=…).
// That keeps the route statically prerendered, which is what lets the service worker cache it for offline use.
export default function HabitPage() {
  return (
    <Suspense fallback={<p className="mono muted">Loading…</p>}>
      <HabitDetail />
    </Suspense>
  );
}

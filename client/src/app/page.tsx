import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  LayoutGrid,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Project Management",
  description: "A focused workspace for projects, tasks, and teams.",
};

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#252a24]";

const tasks = [
  { title: "Finalize product direction", project: "Product", date: "Today", owner: "AK", complete: true },
  { title: "Review launch campaign", project: "Marketing", date: "Sep 12", owner: "JL", complete: false },
  { title: "Prepare customer interviews", project: "Research", date: "Sep 14", owner: "SM", complete: false },
];

export default function WelcomePage() {
  return (
    <div className="min-h-[100svh] bg-[#f3f2ed] text-[#20231f]">
      <header className="border-b border-[#d8d7d0]">
        <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between px-6 sm:px-10 lg:px-16">
          <Link href="/" aria-label="Project Management home" className={`flex items-center gap-3 ${focus}`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#252a24] text-white">
              <LayoutGrid size={17} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Project Management</span>
          </Link>

          <nav className="flex items-center gap-3" aria-label="Account navigation">
            <Link href="/sign-in" className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#e7e5de] ${focus}`}>
              Sign in
            </Link>
            <Link href="/sign-up" className={`hidden items-center gap-2 rounded-full bg-[#252a24] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black sm:inline-flex ${focus}`}>
              Get started <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-[1440px] gap-14 px-6 pb-16 pt-16 sm:px-10 sm:pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20 lg:px-16 lg:pb-24 lg:pt-28">
          <div className="max-w-2xl">
            <div className="mb-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#68705f]">
              <span className="h-2 w-2 rounded-full bg-[#7e8b6f]" aria-hidden="true" />
              A calmer way to work
            </div>

            <h1 className="text-[clamp(3.5rem,6.7vw,7.25rem)] font-medium leading-[0.9] tracking-[-0.07em]">
              Make work<br />feel clear.
            </h1>

            <p className="mt-8 max-w-lg text-lg leading-8 text-[#62655f] sm:text-xl">
              Plan projects, align your team, and move important work forward in one focused workspace.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Link href="/sign-up" className={`inline-flex min-h-12 items-center gap-8 rounded-full bg-[#252a24] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-black ${focus}`}>
                Start for free <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <span className="text-sm text-[#777a73]">No credit card required</span>
            </div>
          </div>

          <div className="relative lg:pt-4">
            <div className="overflow-hidden rounded-[28px] border border-[#cecfc7] bg-[#fbfaf7] shadow-[0_30px_80px_-48px_rgba(31,35,30,0.55)]">
              <div className="flex items-center justify-between border-b border-[#dfded7] px-5 py-4 sm:px-7">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#7e8b6f]" />
                  <span className="text-sm font-semibold">Northstar</span>
                  <ChevronRight size={14} className="text-[#a0a29c]" />
                  <span className="text-sm text-[#777a73]">Overview</span>
                </div>
                <div className="flex -space-x-2" aria-label="Project team">
                  {[
                    ["AK", "bg-[#d6dfcf]"],
                    ["JL", "bg-[#e3d7c9]"],
                    ["SM", "bg-[#d2dae2]"],
                  ].map(([initials, color]) => (
                    <span key={initials} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#fbfaf7] text-[9px] font-semibold ${color}`}>
                      {initials}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-5 sm:p-7 lg:p-8">
                <div className="flex flex-wrap items-end justify-between gap-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#85887f]">Monday, September 8</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Good morning, Alex.</h2>
                  </div>
                  <button type="button" className="flex h-10 items-center gap-2 rounded-full border border-[#d5d5ce] bg-white px-4 text-xs font-semibold text-[#444840]">
                    <Plus size={14} aria-hidden="true" /> New task
                  </button>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[["12", "Open tasks"], ["04", "In progress"], ["82%", "On track"]].map(([value, label]) => (
                    <div key={label} className="rounded-2xl border border-[#e2e1db] bg-white p-4">
                      <p className="text-2xl font-semibold tracking-[-0.04em]">{value}</p>
                      <p className="mt-1 text-xs text-[#85887f]">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Today&apos;s focus</h3>
                    <button type="button" aria-label="More options" className="text-[#8d9089]">
                      <MoreHorizontal size={18} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[#deddd6] bg-white">
                    {tasks.map((task, index) => (
                      <div key={task.title} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5 ${index !== tasks.length - 1 ? "border-b border-[#e8e7e2]" : ""}`}>
                        {task.complete ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7e8b6f] text-white">
                            <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                          </span>
                        ) : (
                          <Circle size={20} strokeWidth={1.3} className="text-[#b2b4ad]" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-medium ${task.complete ? "text-[#8a8d86] line-through" : ""}`}>{task.title}</p>
                          <p className="mt-1 text-[11px] text-[#999b95]">{task.project}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="hidden items-center gap-1.5 text-[11px] text-[#85887f] sm:flex">
                            <CalendarDays size={12} aria-hidden="true" /> {task.date}
                          </span>
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eeece5] text-[9px] font-semibold">{task.owner}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-[#d5d4cc] bg-[#252a24] px-5 py-4 text-white shadow-xl sm:block">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#aeb4a8]">Weekly progress</p>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-2xl font-semibold">18</span>
                <span className="pb-1 text-xs text-[#c9cec5]">tasks completed</span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#d8d7d0] bg-[#eceae3]">
          <div className="mx-auto grid w-full max-w-[1440px] divide-y divide-[#d3d2cb] px-6 sm:px-10 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-16">
            {[
              ["01", "Projects stay organized", "See priorities, owners, and deadlines without chasing updates."],
              ["02", "Everyone stays aligned", "Give your team one reliable place to plan and communicate."],
              ["03", "Progress stays visible", "Know what is moving, what is blocked, and what comes next."],
            ].map(([number, title, copy]) => (
              <div key={number} className="py-9 md:px-8 md:first:pl-0 md:last:pr-0 lg:py-11">
                <span className="text-[11px] font-semibold tracking-[0.15em] text-[#7e8b6f]">{number}</span>
                <h2 className="mt-4 text-base font-semibold tracking-[-0.02em]">{title}</h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#73766f]">{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-7 text-xs text-[#85887f] sm:px-10 lg:px-16">
        <span>© 2026 Project Management</span>
        <span>Built for focused teams.</span>
      </footer>
    </div>
  );
}

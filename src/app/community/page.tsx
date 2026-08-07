import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Community" };

const boards = [
  {
    slug: "notice",
    name: "Notice",
    description: "Announcements and updates from OUR:NARA.",
    count: 2,
  },
  {
    slug: "qa",
    name: "Product Q&A",
    description: "Ask and answer questions about our products.",
    count: 2,
  },
  {
    slug: "faq",
    name: "FAQ",
    description: "Frequently asked questions and answers.",
    count: 4,
  },
];

/** Community hub matching the original: HOME › COMMUNITY breadcrumb and the
 *  Notice / Product Q&A / FAQ board cards. */
export default function CommunityPage() {
  return (
    <div>
      <Container className="py-8">
        {/* Breadcrumb, matching the original .path */}
        <nav className="mb-6 text-xs text-[#888]">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-point-500">
                HOME
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-[#222]">COMMUNITY</li>
          </ol>
        </nav>

        <h1 className="mb-8 font-display text-3xl font-semibold text-ink">
          COMMUNITY
        </h1>

        <div className="grid gap-4 md:grid-cols-3">
          {boards.map((board) => (
            <Link
              key={board.slug}
              href={`/community/${board.slug}`}
              className="group rounded-xl border border-[#e9e9e9] bg-white p-6 transition-shadow hover:shadow-md"
            >
              <p className="text-sm text-[#888]">{board.count} posts</p>
              <h2 className="mt-1 text-xl font-semibold text-ink group-hover:text-point-500">
                {board.name}
              </h2>
              <p className="mt-2 text-sm text-[#666]">{board.description}</p>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}

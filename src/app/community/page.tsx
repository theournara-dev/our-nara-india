import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

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

export default function CommunityPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Community"
        title="Community"
        subtitle="News, questions and help all in one place."
      />
      <Container className="pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {boards.map((board) => (
            <Link
              key={board.slug}
              href={`/community/${board.slug}`}
              className="group rounded-2xl border border-zinc-100 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <p className="text-sm text-zinc-400">{board.count} posts</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-900 group-hover:underline">
                {board.name}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">{board.description}</p>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}

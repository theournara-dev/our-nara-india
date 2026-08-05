import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { faqs, notices, qaPosts, type CommunityPost } from "@/data/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ board: string }>;
}): Promise<Metadata> {
  const { board } = await params;
  const name = boardNames[board as BoardSlug];
  return { title: name ? `${name} · Community` : "Community" };
}

const boardNames = {
  notice: "Notice",
  qa: "Product Q&A",
  faq: "FAQ",
} as const;

type BoardSlug = keyof typeof boardNames;

function postsFor(board: BoardSlug): CommunityPost[] {
  if (board === "notice") return notices;
  if (board === "qa") return qaPosts;
  return faqs.map((f, i) => ({
    id: `faq-${i}`,
    title: f.q,
    date: "",
    body: f.a,
  }));
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ board: string }>;
}) {
  const { board } = await params;
  if (!(board in boardNames)) notFound();

  const name = boardNames[board as BoardSlug];
  const posts = postsFor(board as BoardSlug);

  return (
    <div>
      <PageHeader eyebrow="Community" title={name} />
      <Container className="pb-16">
        <div className="mx-auto max-w-3xl space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-zinc-100 bg-white p-6"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {post.status && (
                  <Badge
                    tone={post.status === "Answered" ? "default" : "outline"}
                  >
                    {post.status}
                  </Badge>
                )}
                {post.author && (
                  <span className="text-xs text-zinc-400">{post.author}</span>
                )}
                {post.date && (
                  <span className="text-xs text-zinc-400">{post.date}</span>
                )}
              </div>
              <h2 className="font-semibold text-zinc-900">{post.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {post.body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </div>
  );
}

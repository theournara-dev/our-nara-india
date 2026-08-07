import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
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

/** Board list page matching the original: a HOME › COMMUNITY › Board breadcrumb
 *  and a board table (No. / Category / Title / Posted by / Date / Views /
 *  Rocommend / Rate) with a Write button. */
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
      <Container className="py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-xs text-[#888]">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-point-500">
                HOME
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/community" className="hover:text-point-500">
                COMMUNITY
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-[#222]">{name}</li>
          </ol>
        </nav>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold text-ink">
            {name}
          </h1>
          <Link
            href="/join"
            className="rounded border border-ink px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
          >
            Write
          </Link>
        </div>

        <div className="overflow-x-auto border border-[#e9e9e9] bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[#e9e9e9] bg-[#fafafa] text-left text-[#555]">
                <th className="w-14 px-4 py-3 font-semibold">No.</th>
                <th className="w-24 px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="w-28 px-4 py-3 font-semibold">Posted by</th>
                <th className="w-28 px-4 py-3 font-semibold">Date</th>
                <th className="w-16 px-4 py-3 text-center font-semibold">
                  Views
                </th>
                <th className="w-20 px-4 py-3 text-center font-semibold">
                  Rocommend
                </th>
                <th className="w-16 px-4 py-3 text-center font-semibold">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, i) => (
                <tr
                  key={post.id}
                  className="border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafa]"
                >
                  <td className="px-4 py-3 text-[#888]">{posts.length - i}</td>
                  <td className="px-4 py-3 text-[#888]">{name}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-[#222]">
                      {post.title}
                    </span>
                    {post.status && (
                      <span className="ml-2 text-xs text-point-500">
                        [{post.status}]
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#555]">
                    {post.author ?? "OUR:NARA"}
                  </td>
                  <td className="px-4 py-3 text-[#888]">{post.date || "-"}</td>
                  <td className="px-4 py-3 text-center text-[#888]">0</td>
                  <td className="px-4 py-3 text-center text-[#888]">0</td>
                  <td className="px-4 py-3 text-center text-[#888]">0</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </div>
  );
}

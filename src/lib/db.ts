import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 uses driver adapters to connect. We construct the pg adapter once
// and reuse a single PrismaClient across hot-reloads in development to avoid
// exhausting database connections. In production a fresh client per serverless
// invocation is fine and this guard is a no-op.
//
// The client is created lazily (on first query) rather than at module load so
// that importing this module during a build never throws, even if DATABASE_URL
// is only available at runtime (e.g. Vercel build vs. runtime env).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

// Proxy defers PrismaClient instantiation until the first query, so merely
// importing `db` (e.g. during `next build`) does not require DATABASE_URL.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

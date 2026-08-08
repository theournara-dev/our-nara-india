import { db } from "../src/lib/db";

async function main() {
  const rows = await db.verification.findMany({
    where: { identifier: { contains: "alice@example.com" } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  for (const r of rows) {
    console.log(JSON.stringify({ identifier: r.identifier, value: r.value }));
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

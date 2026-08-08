import { db } from "../src/lib/db";

async function main() {
  const user = await db.user.findUnique({
    where: { email: "noemail1@testmail.com" },
  });
  if (user) {
    console.log(
      JSON.stringify({
        email: user.email,
        emailVerified: user.emailVerified,
        sessions: await db.session.count({ where: { userId: user.id } }),
      }),
    );
  } else {
    console.log("user not found");
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

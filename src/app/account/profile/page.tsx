import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileForm, type ProfileFields } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    session = null;
  }
  if (!session) redirect("/login?session=expired");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      country: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postal: true,
      telephoneCode: true,
      telephone: true,
      mobileCode: true,
      mobile: true,
    },
  });
  if (!user) redirect("/login?session=expired");

  const initial: ProfileFields = {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    country: user.country ?? "",
    addressLine1: user.addressLine1 ?? "",
    addressLine2: user.addressLine2 ?? "",
    city: user.city ?? "",
    state: user.state ?? "",
    postal: user.postal ?? "",
    telephoneCode: user.telephoneCode ?? "",
    telephone: user.telephone ?? "",
    mobileCode: user.mobileCode ?? "",
    mobile: user.mobile ?? "",
  };

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Profile</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Keep your contact and delivery details up to date. We use them to
        prefill checkout.
      </p>

      <div className="mb-6 flex flex-wrap gap-x-8 gap-y-2 rounded-2xl border border-zinc-100 bg-white p-5 text-sm">
        <div>
          <p className="text-zinc-500">Email</p>
          <p className="font-medium text-zinc-900">{user.email}</p>
        </div>
        <div>
          <p className="text-zinc-500">Member ID</p>
          <p className="font-medium text-zinc-900">
            {user.username ?? "Not set — sign in with Google"}
          </p>
        </div>
      </div>

      <ProfileForm initial={initial} />
    </div>
  );
}

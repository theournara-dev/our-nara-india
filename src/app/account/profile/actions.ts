"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseInput, safeText } from "@/lib/validation";
import { nextUserName } from "@/lib/profile";

export type UpdateProfileResult = { ok: true } | { ok: false; message: string };

const profileInput = z.object({
  firstName: safeText(80, { min: 1, message: "First name is required." }),
  lastName: safeText(80, { min: 1, message: "Last name is required." }),
  country: safeText(80, { min: 1, message: "Country is required." }),
  addressLine1: safeText(200, { min: 1, message: "Address is required." }),
  addressLine2: safeText(200),
  city: safeText(100, { min: 1, message: "City is required." }),
  state: safeText(100),
  postal: safeText(20, { min: 1, message: "Postal code is required." }),
  telephoneCode: safeText(8),
  telephone: safeText(30),
  mobileCode: safeText(8),
  mobile: safeText(30),
});

export async function updateProfile(input: unknown): Promise<UpdateProfileResult> {
  try {
    const session = await requireUser();
    const data = parseInput(profileInput, input, "account.profile");
    const current = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, firstName: true, lastName: true },
    });
    if (!current) return { ok: false, message: "Your account could not be found." };

    const orNull = (value: string) => (value ? value : null);
    await db.user.update({
      where: { id: session.user.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        country: data.country,
        addressLine1: data.addressLine1,
        addressLine2: orNull(data.addressLine2),
        city: data.city,
        state: orNull(data.state),
        postal: data.postal,
        telephoneCode: orNull(data.telephoneCode),
        telephone: orNull(data.telephone),
        mobileCode: orNull(data.mobileCode),
        mobile: orNull(data.mobile),
        name: nextUserName(
          current.name,
          current.firstName,
          current.lastName,
          data.firstName,
          data.lastName,
        ),
      },
    });
    revalidatePath("/account", "layout");
    return { ok: true };
  } catch (error) {
    console.error("[account.profile]", error);
    return { ok: false, message: "Could not save your details." };
  }
}

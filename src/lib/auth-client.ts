import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  emailOTPClient,
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";
import { ac, roles } from "@/lib/permissions";

// The client defaults to the current origin, which keeps local dev, production
// and preview deployments all same-origin (so Origin-header CSRF checks pass).
export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    adminClient({ ac, roles }),
    emailOTPClient(),
    inferAdditionalFields({
      user: {
        firstName: { type: "string", required: false },
        lastName: { type: "string", required: false },
        country: { type: "string", required: false },
        addressLine1: { type: "string", required: false },
        addressLine2: { type: "string", required: false },
        city: { type: "string", required: false },
        state: { type: "string", required: false },
        postal: { type: "string", required: false },
        telephoneCode: { type: "string", required: false },
        telephone: { type: "string", required: false },
        mobileCode: { type: "string", required: false },
        mobile: { type: "string", required: false },
        permissions: { type: "json", required: false },
      },
    }),
  ],
});

"use client";

import { createContext, useContext } from "react";

type AccountUser = {
  id: string;
  name: string;
  email: string;
  role: string | null | undefined;
};

const AccountContext = createContext<{ user: AccountUser } | null>(null);

/** Provides the signed-in user to all account pages so their data is always
 *  scoped to the session user — never to a URL parameter. */
export function AccountProvider({
  user,
  children,
}: {
  user: AccountUser;
  children: React.ReactNode;
}) {
  return (
    <AccountContext.Provider value={{ user }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountUser(): AccountUser {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccountUser must be used within AccountProvider");
  }
  return ctx.user;
}

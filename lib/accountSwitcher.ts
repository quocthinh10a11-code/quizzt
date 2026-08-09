const STORAGE_KEY = "quizzt:remembered-accounts";

export type RememberedAccount = {
  email: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getRememberedAccounts(): RememberedAccount[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is RememberedAccount => {
        return (
          item &&
          typeof item === "object" &&
          typeof item.email === "string" &&
          item.email.trim().length > 0
        );
      })
      .slice(0, 5);
  } catch {
    return [];
  }
}

export function rememberAccount(email: string) {
  if (!canUseStorage() || !email.trim()) return;

  const normalized = email.trim().toLowerCase();
  const accounts = getRememberedAccounts().filter(
    (account) => account.email.toLowerCase() !== normalized
  );

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([{ email: normalized }, ...accounts].slice(0, 5))
  );
}

export function forgetAccount(email: string) {
  if (!canUseStorage()) return;

  const normalized = email.trim().toLowerCase();
  const accounts = getRememberedAccounts().filter(
    (account) => account.email.toLowerCase() !== normalized
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

/** Onboarding profile shape + local draft persisted between onboarding screens. */
export type Profile = {
  name: string; business: string; sector: string; volume: string; goal: string; tone: string; shortcuts: string[];
};
const KEY = "chatplay.profile";
export const loadProfile = (): Partial<Profile> => {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
};
export const saveProfile = (p: Partial<Profile>) => localStorage.setItem(KEY, JSON.stringify(p));

export type ProfileMenuSection = "profil" | "plus" | "powiadomienia";

let section: ProfileMenuSection | null = null;
const listeners = new Set<() => void>();

export function getProfileMenuSection(): ProfileMenuSection | null {
  return section;
}

export function setProfileMenuSection(next: ProfileMenuSection | null): void {
  if (section === next) return;
  section = next;
  for (const listener of listeners) listener();
}

export function subscribeProfileMenuSection(
  onStoreChange: () => void,
): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

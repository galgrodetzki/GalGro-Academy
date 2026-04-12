export function getLocalDateKey(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

export function hasAccessExpired(profile, today = getLocalDateKey()) {
  const accessExpiresOn = profile?.access_expires_on ?? profile?.accessExpiresOn;
  return Boolean(accessExpiresOn && accessExpiresOn < today);
}

export function formatAccessDate(dateKey) {
  if (!dateKey) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function getAccessStatus(profile, today = getLocalDateKey()) {
  if (!profile) return { kind: "unknown", label: "Unknown" };
  const accessExpiresOn = profile.access_expires_on ?? profile.accessExpiresOn;
  if (profile.role === "revoked") return { kind: "revoked", label: "Revoked" };
  if (hasAccessExpired(profile, today)) {
    return { kind: "expired", label: `Expired ${formatAccessDate(accessExpiresOn)}` };
  }
  if (accessExpiresOn) {
    return { kind: "expires", label: `Expires ${formatAccessDate(accessExpiresOn)}` };
  }
  return { kind: "active", label: "Active" };
}

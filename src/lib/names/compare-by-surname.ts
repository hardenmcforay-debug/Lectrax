const NAME_COMPARE: Intl.CollatorOptions = { sensitivity: "base", numeric: true };

function surnameFromFullName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1] ?? trimmed;
}

/** Compare display names by surname (last word), then by the full name. */
export function compareBySurname(aName: string, bName: string): number {
  const bySurname = surnameFromFullName(aName).localeCompare(
    surnameFromFullName(bName),
    undefined,
    NAME_COMPARE
  );
  if (bySurname !== 0) return bySurname;
  return aName.trim().localeCompare(bName.trim(), undefined, NAME_COMPARE);
}

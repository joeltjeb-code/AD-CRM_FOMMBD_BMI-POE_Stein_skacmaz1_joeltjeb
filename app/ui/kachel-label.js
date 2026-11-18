// Beschriftung einer Plan-Kachel: Name + Identifier, weil Namen mehrfach
// vergeben sein können. Der Identifier (z. B. Marktnummer) macht die Kachel
// eindeutig zuordenbar.
export function kachelLabel(name, id) {
  if (!id) return name ?? '';
  if (!name) return id;
  return `${name} (${id})`;
}

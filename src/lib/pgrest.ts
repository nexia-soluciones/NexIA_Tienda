// PostgREST devuelve un embed con relación 1:1 (FK UNIQUE) como OBJETO, no como arreglo.
// Algunas queries o el typegen lo tipan como arreglo. Esto normaliza ambos casos
// para no romper el acceso al stock (bug "no se ven productos" cuando inventory llega como objeto).
export function embedOne<T>(rel: T | T[] | null | undefined): T | undefined {
  if (rel == null) return undefined;
  return Array.isArray(rel) ? rel[0] : rel;
}

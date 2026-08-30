import type { Person } from "@/lib/types";

/** Display order: Ism (given name) Familiya (surname) Otasining ismi (patronymic). */
export function personName(person: Pick<Person, "first_name" | "last_name" | "patronymic">): string {
  return [person.first_name, person.last_name, person.patronymic].filter(Boolean).join(" ");
}

/** Ism + familiya only, no patronymic — for tight spaces (map labels) where the
 * full three-part name would crowd out everything nearby it. */
export function personShortName(person: Pick<Person, "first_name" | "last_name">): string {
  return [person.first_name, person.last_name].filter(Boolean).join(" ");
}

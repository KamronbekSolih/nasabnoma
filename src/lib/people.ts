import type { Person } from "@/lib/types";

/** Display order: Ism (given name) Familiya (surname) Otasining ismi (patronymic). */
export function personName(person: Pick<Person, "first_name" | "last_name" | "patronymic">): string {
  return [person.first_name, person.last_name, person.patronymic].filter(Boolean).join(" ");
}

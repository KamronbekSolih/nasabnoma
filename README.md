# Nasabnoma

A family tree (*shajara*) platform built for Uzbek and CIS families — the conventions
generic genealogy tools handle badly: patronymic naming, urugʻ/aymoq/tarmoq clan
lineage, uncertain historical dates, and multi-script names.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + TypeScript
- **Tailwind CSS v4** — design tokens in `src/app/globals.css`
- **Supabase** — Postgres, Auth, and Storage for photos

## Data model

Relationships follow the **GEDCOM family-unit model**, not parent→child edges:

| Table | Holds |
| --- | --- |
| `people` | Individuals |
| `families` | A couple (`husband_id`, `wife_id` — either may be null) |
| `family_children` | Which children belong to which family |
| `trees` / `tree_members` | Shared trees and per-tree roles |
| `person_revisions` | Edit history (trigger-written) |

A family owns a couple *and* their children together, so a child can't acquire two
fathers, remarriages keep their children distinct, and siblings are read off the
family rather than inferred. It also makes GEDCOM import/export a direct mapping.

## Roles and privacy

Roles are per-tree: `owner` → `admin` → `member` → `viewer`.

Living people's private fields (birth date, address, contacts, photo, biography) are
masked for non-admins by the `people_view` database view — enforced in Postgres, not
in the UI, so a modified client still can't read them. Deceased people are fully
visible; that's the point of a shajara. Individuals can claim their own record and
opt it public.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

## Database migrations

`supabase/` holds the schema. Apply in order via the Supabase SQL Editor:

1. `schema.sql`, `rls.sql`
2. `migrations/002` … `migrations/011`

Each migration ends by recording itself in `schema_migrations`, so
`select * from schema_migrations order by version;` always shows what has been
applied. Migrations are written to be safe to re-run.

## Project layout

```
src/app/          routes + server actions
src/components/   UI, grouped by feature
src/lib/tree/     FamilyGraph — every relationship question is answered here
src/lib/reference/ Uzbekistan regions, urugʻ names, nationalities
supabase/         schema + migrations
```

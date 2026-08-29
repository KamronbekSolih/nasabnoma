-- Structured birthplace / current location (country -> region -> district, with the
-- finest level always free text) and the millat -> urugʻ -> aymoq -> tarmoq clan
-- hierarchy. `urug` already exists from schema.sql and is reused as-is.

alter table people
  add column birth_country text,
  add column birth_region text,
  add column birth_district text,
  add column birth_mahalla text,
  add column current_country text,
  add column current_region text,
  add column current_district text,
  add column current_address text,
  add column millat text,
  add column aymoq text,
  add column tarmoq text;

-- Carry forward whatever was in the old single free-text birthplace field.
update people set birth_mahalla = birth_place where birth_place is not null;
alter table people drop column birth_place;

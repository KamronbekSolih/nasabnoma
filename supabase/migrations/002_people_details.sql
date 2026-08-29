-- Splits full_name into first_name / last_name (familiya) / patronymic (otasining ismi),
-- and adds telegram/instagram contact fields.

alter table people
  add column first_name text,
  add column last_name text,
  add column patronymic text,
  add column telegram text,
  add column instagram text;

update people set first_name = full_name where first_name is null;

alter table people alter column first_name set not null;
alter table people drop column full_name;

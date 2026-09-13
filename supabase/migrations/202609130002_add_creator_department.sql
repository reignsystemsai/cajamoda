alter table public.creator_applications
  add column if not exists department text;

alter table public.creator_applications
  add constraint creator_applications_department_length
  check (
    department is null
    or char_length(btrim(department)) between 1 and 120
  );


create policy "farm list readable by authenticated" on public.farms for select to authenticated using (true);

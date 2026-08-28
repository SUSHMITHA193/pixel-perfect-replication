
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.can_view_farm(uuid, uuid) from anon, public;
revoke execute on function public.can_edit_farm(uuid, uuid) from anon, public;
revoke execute on function public.can_view_animal(uuid, uuid) from anon, public;
revoke execute on function public.can_edit_animal(uuid, uuid) from anon, public;
revoke execute on function public.touch_updated_at() from anon, public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.can_view_farm(uuid, uuid) to authenticated;
grant execute on function public.can_edit_farm(uuid, uuid) to authenticated;
grant execute on function public.can_view_animal(uuid, uuid) to authenticated;
grant execute on function public.can_edit_animal(uuid, uuid) to authenticated;

-- Atomic, admin-only role change. Replaces the client-side
-- delete-then-insert which could leave a user with no role
-- when the insert failed after the delete succeeded.
create or replace function public.admin_set_user_role(_user_id uuid, _new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only administrators can change roles';
  end if;
  if _user_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;
  if public.has_role(_user_id, 'admin') then
    raise exception 'The Admin role cannot be changed';
  end if;
  insert into public.user_roles (user_id, role)
  values (_user_id, _new_role)
  on conflict (user_id, role) do nothing;
  delete from public.user_roles
  where user_id = _user_id and role <> _new_role;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, public.app_role) from anon, public;
grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;
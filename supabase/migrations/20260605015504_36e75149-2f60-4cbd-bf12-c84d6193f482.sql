
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
  default_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1) || '_' || substring(NEW.id::text,1,4))
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    default_role := 'admin';
  ELSE
    default_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'viewer');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, default_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

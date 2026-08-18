CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count INT;
  default_role public.app_role;
  new_status TEXT;
BEGIN
  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    default_role := 'admin';
  ELSE
    default_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role','admin')::public.app_role, 'viewer');
    IF default_role NOT IN ('bhw','viewer') THEN
      default_role := 'viewer';
    END IF;
  END IF;

  IF default_role = 'viewer' THEN
    new_status := 'pending';
  ELSE
    new_status := 'active';
  END IF;

  INSERT INTO public.profiles (id, full_name, username, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1) || '_' || substring(NEW.id::text,1,4)),
    new_status
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, default_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $function$;
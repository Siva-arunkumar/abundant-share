
-- Update the handle_new_user function to properly handle the role casting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'role' IN ('donor', 'recipient', 'admin') 
      THEN (NEW.raw_user_meta_data ->> 'role')::user_role
      ELSE 'donor'::user_role
    END
  );
  RETURN NEW;
END;
$$;

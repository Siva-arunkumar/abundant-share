-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for food_listings
DROP POLICY IF EXISTS "Everyone can view available listings" ON public.food_listings;
DROP POLICY IF EXISTS "Donors can create listings" ON public.food_listings;
DROP POLICY IF EXISTS "Donors can update their own listings" ON public.food_listings;
DROP POLICY IF EXISTS "Donors can delete their own listings" ON public.food_listings;

CREATE POLICY "Everyone can view available listings" ON public.food_listings FOR SELECT USING (true);
CREATE POLICY "Donors can create listings" ON public.food_listings FOR INSERT WITH CHECK (auth.uid() = donor_id);
CREATE POLICY "Donors can update their own listings" ON public.food_listings FOR UPDATE USING (auth.uid() = donor_id);
CREATE POLICY "Donors can delete their own listings" ON public.food_listings FOR DELETE USING (auth.uid() = donor_id);

-- Create RLS policies for claims
DROP POLICY IF EXISTS "Users can view their own claims" ON public.claims;
DROP POLICY IF EXISTS "Users can create claims" ON public.claims;
DROP POLICY IF EXISTS "Users can update their own claims" ON public.claims;

CREATE POLICY "Users can view their own claims" ON public.claims FOR SELECT USING (auth.uid() = claimed_by OR auth.uid() IN (SELECT donor_id FROM food_listings WHERE id = listing_id));
CREATE POLICY "Users can create claims" ON public.claims FOR INSERT WITH CHECK (auth.uid() = claimed_by);
CREATE POLICY "Users can update their own claims" ON public.claims FOR UPDATE USING (auth.uid() = claimed_by);

-- Create RLS policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Create security definer function for checking admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, auth;

-- Create RLS policies for contact_messages using security definer function
DROP POLICY IF EXISTS "Admins can view all contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Anyone can create contact messages" ON public.contact_messages;

CREATE POLICY "Admins can view all contact messages" ON public.contact_messages FOR SELECT USING (public.is_admin());
CREATE POLICY "Anyone can create contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);

-- Create RLS policies for platform_stats
DROP POLICY IF EXISTS "Everyone can view platform stats" ON public.platform_stats;
DROP POLICY IF EXISTS "Admins can update platform stats" ON public.platform_stats;

CREATE POLICY "Everyone can view platform stats" ON public.platform_stats FOR SELECT USING (true);
CREATE POLICY "Admins can update platform stats" ON public.platform_stats FOR UPDATE USING (public.is_admin());

-- Create function to update timestamps with fixed search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_food_listings_updated_at ON public.food_listings;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_listings_updated_at
  BEFORE UPDATE ON public.food_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration with fixed search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'donor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to create notifications with fixed search path
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_listing_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, listing_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_listing_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create storage policies for food images
DROP POLICY IF EXISTS "Anyone can view food images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload food images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own food images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own food images" ON storage.objects;

CREATE POLICY "Anyone can view food images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'food-images');

CREATE POLICY "Authenticated users can upload food images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'food-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own food images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'food-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own food images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'food-images' AND auth.role() = 'authenticated');

-- Enable realtime for tables
ALTER TABLE public.food_listings REPLICA IDENTITY FULL;
ALTER TABLE public.claims REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.claims;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import localListings from '@/lib/localListings';
import { toast } from '@/hooks/use-toast';
import { FoodCategory } from '@/types';
import { Database } from '@/integrations/supabase/types';
import { ArrowLeft, Upload } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  quantity: z.string().min(1, 'Quantity is required'),
  category: z.string().min(1, 'Category is required'),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  pickup_time_start: z.string().min(1, 'Pickup start time is required'),
  pickup_time_end: z.string().min(1, 'Pickup end time is required'),
  pickup_location: z.string().min(1, 'Pickup location is required'),
});

type FormData = z.infer<typeof formSchema>;

const FOOD_CATEGORIES: { value: string; label: string }[] = [
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'grains', label: 'Grains & Cereals' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'meat', label: 'Meat & Fish' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'prepared_food', label: 'Prepared Food' },
  { value: 'other', label: 'Other' },
];

const CreateListing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      quantity: '',
      category: '',
      expiry_date: '',
      pickup_time_start: '',
      pickup_time_end: '',
      pickup_location: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to create a listing.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Combine date and time for pickup slots
      const expiryDateTime = new Date(data.expiry_date).toISOString();
      const pickupStart = new Date(data.pickup_time_start).toISOString();
      const pickupEnd = new Date(data.pickup_time_end).toISOString();

      // Dev fallback when Supabase is not configured
      const viteUrl = import.meta.env.VITE_SUPABASE_URL;
      const isDevUser = user.id && String(user.id).startsWith('dev-');
      if (!viteUrl || isDevUser) {
        const { data: localData, error } = await localListings.localCreateListing({
          donor_id: user.id,
          title: data.title,
          description: data.description,
          quantity: data.quantity,
          category: data.category as any,
          expiry_date: expiryDateTime,
          pickup_time_start: pickupStart,
          pickup_time_end: pickupEnd,
          pickup_location: data.pickup_location,
          status: 'available',
          images: [],
        });

        if (error) {
          toast({ title: 'Error', description: 'Failed to create listing. Please try again.', variant: 'destructive' });
          console.error('Error creating listing (local):', error);
          return;
        }

  toast({ title: 'Success!', description: 'Your food listing has been created successfully (local).' });
  // Notify dashboard to refresh local listings
  window.dispatchEvent(new Event('localListingsUpdated'));
  navigate('/dashboard');
        return;
      }

      try {
        const { error } = await supabase.from('food_listings').insert({
          donor_id: user.id,
          title: data.title,
          description: data.description,
          quantity: data.quantity,
          category: data.category as Database['public']['Enums']['food_category'],
          expiry_date: expiryDateTime,
          pickup_time_start: pickupStart,
          pickup_time_end: pickupEnd,
          pickup_location: data.pickup_location,
          status: 'available',
          images: [], // Will add file upload later
        } as any);

        if (error) throw error;
      } catch (supabaseError) {
        console.warn('Supabase insert failed, falling back to local storage:', supabaseError);
        const { data: localData, error } = await localListings.localCreateListing({
          donor_id: user.id,
          title: data.title,
          description: data.description,
          quantity: data.quantity,
          category: data.category as any,
          expiry_date: expiryDateTime,
          pickup_time_start: pickupStart,
          pickup_time_end: pickupEnd,
          pickup_location: data.pickup_location,
          status: 'available',
          images: [],
        });

        if (error) {
          toast({ title: 'Error', description: 'Failed to create listing. Please try again.', variant: 'destructive' });
          console.error('Error creating listing (local):', error);
          return;
        }
      }

      toast({
        title: 'Success!',
        description: 'Your food listing has been created successfully.',
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <h1 className="text-3xl font-bold">Create Food Listing</h1>
        <p className="text-muted-foreground">
          Share your surplus food with those in need
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Food Details</CardTitle>
          <CardDescription>
            Provide information about the food you want to share
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Food Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Fresh vegetables, Cooked rice" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide details about the food, preparation method, ingredients, etc."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 5 kg, 20 servings" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select food category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FOOD_CATEGORIES.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date & Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      When does this food expire?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pickup_time_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Start Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pickup_time_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup End Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="pickup_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Full address or landmark"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Where can recipients collect the food?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'Create Listing'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateListing;
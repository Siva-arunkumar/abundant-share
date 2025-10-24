import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { PlatformStats } from '@/types';
import { Users, Utensils, Building2, ArrowRight, CheckCircle, Clock, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

const Index = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from('platform_stats')
        .select('*')
        .single();
      
      if (data) setStats(data);
    };

    fetchStats();
  }, []);

  // Real-time updates for platform stats
  useRealtimeSubscription({
    table: 'platform_stats',
    event: 'UPDATE',
    onPayload: (payload) => {
      if (payload.new) {
        setStats(payload.new);
      }
    }
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 to-primary/5 h-screen flex items-center px-4">
        <div className="container mx-auto text-center">
          <motion.div 
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-6 text-foreground"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Reducing Food Waste, <br />
              <span className="text-primary">Fighting Hunger</span>
            </motion.h1>
            <motion.p 
              className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Connect food donors with NGOs and communities in need. Every meal shared makes a difference in someone's life and helps protect our planet.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {user ? (
                <Button asChild size="lg" className="text-lg px-8 hover-scale">
                  <Link to="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="text-lg px-8 hover-scale">
                  <Link to="/auth">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Impact Statistics */}
      {stats && (
        <section className="h-screen flex items-center px-4 bg-background">
          <div className="container mx-auto">
            <motion.h2 
              className="text-3xl font-bold text-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              Our Impact
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="text-center hover-scale">
                  <CardHeader>
                    <Utensils className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle className="text-3xl font-bold text-primary">
                      {stats.total_meals_served.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Meals Served</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="text-center hover-scale">
                  <CardHeader>
                    <Users className="h-12 w-12 text-success mx-auto mb-4" />
                    <CardTitle className="text-3xl font-bold text-success">
                      {stats.total_food_saved_kg.toLocaleString()}kg
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Food Saved</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <Card className="text-center hover-scale">
                  <CardHeader>
                    <Building2 className="h-12 w-12 text-info mx-auto mb-4" />
                    <CardTitle className="text-3xl font-bold text-info">
                      {stats.total_ngos_onboarded}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">NGOs Onboarded</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="h-screen flex items-center px-4 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Utensils className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Donate</h3>
              <p className="text-muted-foreground">
                List your surplus food with details about quantity, location, and pickup times.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-success/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect</h3>
              <p className="text-muted-foreground">
                NGOs and communities browse available food and claim what they need.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-info/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-info" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Share</h3>
              <p className="text-muted-foreground">
                Coordinate pickup times and complete the food sharing process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="h-screen flex items-center px-4 bg-background">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Clock className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Real-time Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get instant notifications when food is available or claimed in your area.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MapPin className="h-8 w-8 text-success mb-2" />
                <CardTitle>Location-based</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Find food donations near you and optimize pickup routes for efficiency.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-info mb-2" />
                <CardTitle>Community Driven</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Join a network of caring individuals and organizations making a difference.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="h-screen flex items-center px-4 bg-primary/10">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Make a Difference?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our community today and start sharing food, reducing waste, and fighting hunger in your area.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/about">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
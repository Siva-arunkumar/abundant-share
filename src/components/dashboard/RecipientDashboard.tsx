import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, MapPin, Package, Calendar, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Claim } from '@/types';
import { format } from 'date-fns';

interface RecipientDashboardProps {
  claims: Claim[];
  onMarkCollected: (claimId: string) => void;
}

const RecipientDashboard: React.FC<RecipientDashboardProps> = ({
  claims,
  onMarkCollected,
}) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'pending' | 'collected' | 'cancelled'>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'collected': return 'bg-success text-success-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredClaims = claims.filter(claim => 
    filter === 'all' || claim.status === filter
  );

  const stats = {
    total: claims.length,
    pending: claims.filter(c => c.status === 'pending').length,
    collected: claims.filter(c => c.status === 'collected').length,
    cancelled: claims.filter(c => c.status === 'cancelled').length,
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending Pickup</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">{stats.collected}</div>
            <p className="text-xs text-muted-foreground">Collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          {(['all', 'pending', 'collected', 'cancelled'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
        
        <Button asChild>
          <Link to="/browse">
            <Search className="mr-2 h-4 w-4" />
            {t('dashboard.recipient.browseFood')}
          </Link>
        </Button>
      </div>

      {/* Claims Grid */}
      <div className="grid gap-6">
        {filteredClaims.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
              </h3>
              <p className="text-muted-foreground mb-4">
                {filter === 'all' 
                  ? 'Browse available food to start claiming donations.'
                  : `You don't have any ${filter} bookings at the moment.`
                }
              </p>
              {filter === 'all' && (
                <Button asChild>
                  <Link to="/browse">
                    Browse Food
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredClaims.map((claim, index) => (
            <motion.div
              key={claim.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {claim.food_listings?.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {claim.food_listings?.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(claim.status)}>
                        {claim.status}
                      </Badge>
                      {claim.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => onMarkCollected(claim.id)}
                        >
                          Mark Collected
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {claim.quantity_booked && (
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Booked: {claim.quantity_booked}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{claim.food_listings?.pickup_location}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>
                        Pickup: {format(new Date(claim.food_listings?.pickup_time_start!), 'MMM dd, HH:mm')} - 
                        {format(new Date(claim.food_listings?.pickup_time_end!), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Claimed: {format(new Date(claim.claimed_at), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  
                  {claim.food_listings?.profiles && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">
                        Donor: {claim.food_listings.profiles.full_name}
                      </p>
                      {claim.food_listings.profiles.phone && (
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <Phone className="h-3 w-3 mr-1" />
                          {claim.food_listings.profiles.phone}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {claim.notes && (
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <strong>Notes:</strong> {claim.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default RecipientDashboard;
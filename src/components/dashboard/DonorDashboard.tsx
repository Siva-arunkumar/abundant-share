import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Clock, MapPin, Calendar, Edit, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { FoodListing } from '@/types';
import { format } from 'date-fns';

interface DonorDashboardProps {
  listings: FoodListing[];
  onEditListing: (listing: FoodListing) => void;
  onDeleteListing: (listingId: string) => void;
}

const DonorDashboard: React.FC<DonorDashboardProps> = ({
  listings,
  onEditListing,
  onDeleteListing,
}) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'available' | 'claimed' | 'expired'>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-success text-success-foreground';
      case 'claimed': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-info text-info-foreground';
      case 'expired': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredListings = listings.filter(listing => 
    filter === 'all' || listing.status === filter
  );

  const stats = {
    total: listings.length,
    available: listings.filter(l => l.status === 'available').length,
    claimed: listings.filter(l => l.status === 'booked').length,
    completed: listings.filter(l => l.status === 'completed').length,
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
            <p className="text-xs text-muted-foreground">Total Listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">{stats.available}</div>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{stats.claimed}</div>
            <p className="text-xs text-muted-foreground">Claimed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-info">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          {(['all', 'available', 'claimed', 'expired'] as const).map((status) => (
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
          <Link to="/create-listing">
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.donor.addFood')}
          </Link>
        </Button>
      </div>

      {/* Listings Grid */}
      <div className="grid gap-6">
        {filteredListings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {filter === 'all' ? 'No listings yet' : `No ${filter} listings`}
              </h3>
              <p className="text-muted-foreground mb-4">
                {filter === 'all' 
                  ? 'Start making a difference by creating your first food listing.'
                  : `You don't have any ${filter} listings at the moment.`
                }
              </p>
              {filter === 'all' && (
                <Button asChild>
                  <Link to="/create-listing">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Listing
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredListings.map((listing, index) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {listing.title}
                        {listing.is_urgent && (
                          <Badge variant="destructive">Urgent</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {listing.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(listing.status)}>
                        {listing.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditListing(listing)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteListing(listing.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Quantity: {listing.quantity}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{listing.pickup_location}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Expires: {format(new Date(listing.expiry_date), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  
                  {listing.claimed_by && listing.profiles && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">
                        Claimed by: {listing.profiles.full_name}
                        {listing.profiles.organization_name && ` (${listing.profiles.organization_name})`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Claimed on: {format(new Date(listing.claimed_at!), 'MMM dd, yyyy HH:mm')}
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

export default DonorDashboard;
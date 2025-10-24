import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import localListings from '@/lib/localListings';
import { useAuth } from '@/contexts/AuthContext';
import { FoodListing, Claim, Profile } from '@/types';
import { 
  Users, 
  Package, 
  TrendingUp, 
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Cell,
  Pie,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

interface AdminStats {
  totalUsers: number;
  totalDonors: number;
  totalRecipients: number;
  totalListings: number;
  totalClaims: number;
  mealsServed: number;
  foodSavedKg: number;
  activeListings: number;
  expiredListings: number;
  completedTransactions: number;
  successRate: number;
}

interface ChartData {
  name: string;
  donated: number;
  received: number;
  wasted: number;
}

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentListings, setRecentListings] = useState<FoodListing[]>([]);
  const [recentClaims, setRecentClaims] = useState<Claim[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Users tab state
  const [userQuery, setUserQuery] = useState('');
  const [userPage, setUserPage] = useState(1);
  const perPage = 8;

  // Donations tab state / form
  const [donationForm, setDonationForm] = useState({ title: '', description: '', quantity: 1 });
  const [donationQuery, setDonationQuery] = useState('');
  const [donationPage, setDonationPage] = useState(1);

  // Requests tab state
  const [requestQuery, setRequestQuery] = useState('');
  const [requestPage, setRequestPage] = useState(1);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAdminData();
    }
  }, [profile]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Prefer backend aggregate endpoint
      if (typeof window !== 'undefined') {
        try {
          const res = await fetch('/api/admin');
          if (res.ok) {
            const payload = await res.json();
            // payload: { stats, users, donations, requests, chartData }
            setStats(payload.stats || null);
            setUsers(payload.users || []);
            setRecentListings(payload.donations || []);
            setRecentClaims(payload.requests || []);
            setChartData(payload.chartData || []);
            setLoading(false);
            return;
          }
        } catch (e) {
          // ignore and fall back
        }
      }

      // Fall back to Supabase if /api/admin not available
      const viteUrl = import.meta.env.VITE_SUPABASE_URL;
      if (viteUrl) {
        // fetch counts
        const [{ data: usersData }, { data: listingsData }] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('food_listings').select('*'),
        ] as any);
        const totalUsers = (usersData || []).length;
        const totalListings = (listingsData || []).length;
        setStats({
          totalUsers,
          totalDonors: totalUsers,
          totalRecipients: 0,
          totalListings,
          totalClaims: 0,
          mealsServed: 0,
          foodSavedKg: 0,
          activeListings: (listingsData || []).filter((l:any)=> l.status === 'available').length,
          expiredListings: 0,
          completedTransactions: 0,
          successRate: 0,
        });
        setUsers((usersData || []) as any);
        setRecentListings((listingsData || []) as any);
        setRecentClaims([]);
        setLoading(false);
        return;
      }

      // Localdev fallback
      const listings = await localListings.localFetchListings();
      const usersRaw = localStorage.getItem('dev_users_v1');
      const localUsers = usersRaw ? JSON.parse(usersRaw) : [];
      setStats({
        totalUsers: localUsers.length || 1,
        totalDonors: localUsers.length || 1,
        totalRecipients: 0,
        totalListings: listings.length,
        totalClaims: 0,
        mealsServed: 0,
        foodSavedKg: 0,
        activeListings: listings.filter(l => l.status === 'available').length,
        expiredListings: 0,
        completedTransactions: 0,
        successRate: 0,
      });
      setUsers(localUsers.map((u:any)=> u.profile || { id:u.id, full_name: u.email, role: u.profile?.role || 'user', created_at: new Date().toISOString() }));
      setRecentListings(listings as any);
      setRecentClaims([]);
      setLoading(false);
    } catch (err: any) {
      console.error('fetchAdminData err', err);
      setError('Failed to load admin data');
      setLoading(false);
    }
  };

  const exportData = async (type: 'listings' | 'claims' | 'users') => {
    try {
      let data: any[] = [];
      let filename = '';

      switch (type) {
        case 'listings':
          if (!import.meta.env.VITE_SUPABASE_URL) {
            data = await localListings.localFetchListings();
          } else {
            const { data: listingsData } = await supabase
              .from('food_listings')
              .select(`
                *,
                profiles:donor_id (full_name, organization_name, phone)
              `);
            data = listingsData || [];
          }
          filename = 'food_listings.csv';
          break;
        case 'claims':
          if (!import.meta.env.VITE_SUPABASE_URL) {
            data = await localListings.localFetchClaimsByUser('') as any[]; // all claims unsupported; fetch none
          } else {
            const { data: claimsData } = await supabase
              .from('claims')
              .select(`
                *,
                food_listings (title, pickup_location),
                profiles:claimed_by (full_name, phone)
              `);
            data = claimsData || [];
          }
          filename = 'claims.csv';
          break;
        case 'users':
          if (!import.meta.env.VITE_SUPABASE_URL) {
            data = JSON.parse(localStorage.getItem('dev_users_v1') || '[]').map((u: any) => u.profile || { id: u.id, full_name: u.profile?.full_name || u.email, email: u.email, role: u.profile?.role || 'user', created_at: u.profile?.created_at || new Date().toISOString() });
          } else {
            data = users;
          }
          filename = 'users.csv';
          break;
      }

      // Simple CSV export
      if (data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const csvContent = [
          headers,
          ...data.map(row => Object.values(row).map(val => 
            typeof val === 'object' ? JSON.stringify(val) : val
          ).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);

        toast({
          title: "Export Successful",
          description: `${type} data exported successfully`,
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        const usersRaw = localStorage.getItem('dev_users_v1');
        if (usersRaw) {
          const parsed = JSON.parse(usersRaw) as any[];
          const remaining = parsed.filter(u => u.id !== userId);
          localStorage.setItem('dev_users_v1', JSON.stringify(remaining));
          toast({ title: 'User removed', description: 'Local user removed.' });
          fetchAdminData();
          return;
        }
      } else {
        const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
        if (error) throw error;
        toast({ title: 'User removed', description: 'User removed from database.' });
        fetchAdminData();
      }
    } catch (e) {
      console.error('Delete user error:', e);
      toast({ title: 'Remove Failed', description: 'Could not remove user', variant: 'destructive' });
    }
  };

  const refresh = () => fetchAdminData();

  const deleteListing = async (listingId: string) => {
    try {
      const viteUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!viteUrl) {
        await localListings.localDeleteListing(listingId);
        toast({ title: 'Listing deleted', description: 'Listing removed from local data.' });
        refresh();
        return;
      }

      const { error } = await supabase.from('food_listings').delete().eq('id', listingId);
      if (error) throw error;
      toast({ title: 'Listing deleted', description: 'Listing removed from database.' });
      refresh();
    } catch (e) {
      console.error('Delete listing error:', e);
      toast({ title: 'Delete Failed', description: 'Could not delete listing', variant: 'destructive' });
    }
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      const viteUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!viteUrl) {
        // update local users
        const usersRaw = localStorage.getItem('dev_users_v1');
        if (usersRaw) {
          const parsed = JSON.parse(usersRaw) as any[];
          const u = parsed.find(p => p.id === userId);
          if (u) {
            u.profile = u.profile || {};
            u.profile.role = newRole;
            localStorage.setItem('dev_users_v1', JSON.stringify(parsed));
            toast({ title: 'Role updated', description: 'Local user role updated.' });
            fetchAdminData();
            return;
          }
        }
        toast({ title: 'User not found', description: 'Could not find local user', variant: 'destructive' });
        return;
      }

  const { error } = await supabase.from('profiles').update({ role: newRole as any }).eq('user_id', userId);
      if (error) throw error;
      toast({ title: 'Role updated', description: 'User role updated successfully.' });
      fetchAdminData();
    } catch (e) {
      console.error('Change role error:', e);
      toast({ title: 'Update Failed', description: 'Could not change user role', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-success text-success-foreground';
      case 'claimed': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-info text-info-foreground';
      case 'expired': return 'bg-destructive text-destructive-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'received': return 'bg-success text-success-foreground';
      case 'cancelled': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const pieData = [
    { name: 'Available', value: stats?.activeListings || 0, color: '#22c55e' },
    { name: 'Claimed', value: (stats?.totalListings || 0) - (stats?.activeListings || 0) - (stats?.expiredListings || 0), color: '#f59e0b' },
    { name: 'Expired', value: stats?.expiredListings || 0, color: '#ef4444' },
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">{error}</div>
        <div className="text-center mt-4">
          <Button onClick={fetchAdminData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor platform activity and manage the food sharing community
        </p>
      </motion.div>

      {/* Key Metrics */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalListings}</div>
            <p className="text-xs text-muted-foreground">Listings created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Food Shared This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mealsServed}</div>
            <p className="text-xs text-muted-foreground">Meals distributed this month</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts and Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="mb-4">
          <nav className="text-sm text-muted-foreground">Home / Admin / Dashboard</nav>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="donations">Donations</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Users</h3>
              <div className="flex items-center gap-2">
                <Input placeholder="Search users" value={userQuery} onChange={(e)=>{ setUserQuery(e.target.value); setUserPage(1); }} />
                <Button onClick={refresh} variant="ghost"><Loader2 className="h-4 w-4 mr-2"/>Refresh</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="py-2">Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u=> (u.full_name|| (u as any).email||'').toLowerCase().includes(userQuery.toLowerCase())).slice((userPage-1)*perPage, userPage*perPage).map(u=> (
                    <tr key={u.id} className="border-b">
                      <td className="py-2">{u.full_name || (u as any).email}</td>
                      <td>{(u as any).email || ''}</td>
                      <td className="capitalize">{u.role}</td>
                      <td>{u.created_at ? format(new Date(u.created_at), 'MMM dd, yyyy') : '-'}</td>
                      <td>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={()=> changeUserRole((u.user_id as string) || (u.id as string), u.role === 'admin' ? 'user' : 'admin')}>{u.role === 'admin' ? 'Revoke' : 'Make Admin'}</Button>
                          <Button size="sm" variant="ghost" onClick={()=> deleteUser((u.user_id as string) || (u.id as string))}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {userPage}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={()=> setUserPage(p => Math.max(1, p-1))}>Prev</Button>
                <Button size="sm" onClick={()=> setUserPage(p => p+1)}>Next</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="donations" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Donations</h3>
              <div className="flex items-center gap-2">
                <Input placeholder="Search donations" value={donationQuery} onChange={(e)=>{ setDonationQuery(e.target.value); setDonationPage(1); }} />
                <Button onClick={refresh} variant="ghost"><Loader2 className="h-4 w-4 mr-2"/>Refresh</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="text-left text-sm text-muted-foreground"><th>Title</th><th>Donor</th><th>Quantity</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {recentListings.filter(l=> (l.title||'').toLowerCase().includes(donationQuery.toLowerCase())).slice((donationPage-1)*perPage, donationPage*perPage).map(l=> (
                        <tr key={l.id} className="border-b">
                          <td className="py-2">{l.title}</td>
                          <td>{(l as any).profiles?.full_name || l.donor_id}</td>
                          <td>{l.quantity}</td>
                          <td>{l.status}</td>
                          <td><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={()=> deleteListing(l.id)}>Delete</Button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Page {donationPage}</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={()=> setDonationPage(p => Math.max(1, p-1))}>Prev</Button>
                    <Button size="sm" onClick={()=> setDonationPage(p => p+1)}>Next</Button>
                  </div>
                </div>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Add Donation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Input placeholder="Title" value={donationForm.title} onChange={(e)=> setDonationForm(f=> ({ ...f, title: e.target.value }))} />
                      <Input placeholder="Description" value={donationForm.description} onChange={(e)=> setDonationForm(f=> ({ ...f, description: e.target.value }))} />
                      <Input placeholder="Quantity" type="number" value={donationForm.quantity} onChange={(e)=> setDonationForm(f=> ({ ...f, quantity: Number(e.target.value) }))} />
                      <div className="flex gap-2">
                        <Button onClick={async ()=> {
                          // create donation locally for dev or via Supabase
                          try {
                            if (!import.meta.env.VITE_SUPABASE_URL) {
                              await localListings.localCreateListing({ title: donationForm.title, description: donationForm.description, quantity: String(donationForm.quantity), donor_id: (profile?.user_id as any) || (profile?.id as any) || 'dev-user-id-1' });
                              toast({ title: 'Donation created', description: 'Donation added to local data.' });
                              fetchAdminData();
                            } else {
                              const { error } = await supabase.from('food_listings').insert({ title: donationForm.title, description: donationForm.description, quantity: String(donationForm.quantity), donor_id: profile?.user_id || profile?.id } as any);
                              if (error) throw error;
                              toast({ title: 'Donation created', description: 'Donation added to database.' });
                              fetchAdminData();
                            }
                          } catch (e) { console.error(e); toast({ title: 'Failed', description: 'Could not create donation', variant: 'destructive' }); }
                        }}>Create</Button>
                        <Button variant="ghost" onClick={()=> setDonationForm({ title: '', description: '', quantity: 1 })}>Clear</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Requests</h3>
              <div className="flex items-center gap-2">
                <Input placeholder="Search requests" value={requestQuery} onChange={(e)=>{ setRequestQuery(e.target.value); setRequestPage(1); }} />
                <Button onClick={refresh} variant="ghost"><Loader2 className="h-4 w-4 mr-2"/>Refresh</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground"><th>Listing</th><th>Requested By</th><th>Quantity</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {recentClaims.filter(r=> ((r as any).food_listings?.title || '').toLowerCase().includes(requestQuery.toLowerCase())).slice((requestPage-1)*perPage, requestPage*perPage).map(r=> (
                    <tr key={r.id} className="border-b">
                      <td className="py-2">{(r as any).food_listings?.title}</td>
                      <td>{(r as any).profiles?.full_name || r.claimed_by}</td>
                      <td>{(r as any).quantity_requested || (r.quantity_booked as any) || ''}</td>
                      <td>{r.status || 'pending'}</td>
                      <td>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async ()=> {
                            try {
                              if (!import.meta.env.VITE_SUPABASE_URL) {
                                // local claim approve (not implemented granularly) - just show toast
                                toast({ title: 'Approved', description: 'Request approved (local)' });
                              } else {
                                // Map admin 'approve' to allowed status 'collected'
                                const { error } = await supabase.from('claims').update({ status: 'collected' as any }).eq('id', r.id);
                                if (error) throw error;
                                toast({ title: 'Approved', description: 'Request approved' });
                                fetchAdminData();
                              }
                            } catch (e) { console.error(e); toast({ title: 'Failed', description: 'Could not approve', variant: 'destructive' }); }
                          }}>Approve</Button>
                          <Button size="sm" variant="ghost" onClick={async ()=> {
                            try {
                              if (!import.meta.env.VITE_SUPABASE_URL) {
                                toast({ title: 'Rejected', description: 'Request rejected (local)' });
                              } else {
                                // Map admin 'reject' to allowed status 'cancelled'
                                const { error } = await supabase.from('claims').update({ status: 'cancelled' as any }).eq('id', r.id);
                                if (error) throw error;
                                toast({ title: 'Rejected', description: 'Request rejected' });
                                fetchAdminData();
                              }
                            } catch (e) { console.error(e); toast({ title: 'Failed', description: 'Could not reject', variant: 'destructive' }); }
                          }}>Reject</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {requestPage}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={()=> setRequestPage(p => Math.max(1, p-1))}>Prev</Button>
                <Button size="sm" onClick={()=> setRequestPage(p => p+1)}>Next</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="listings" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Recent Food Listings</h3>
              <div className="flex items-center gap-2">
                <Button onClick={refresh} variant="ghost">
                  <Activity className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button onClick={() => exportData('listings')} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {recentListings.map((listing) => (
                <Card key={listing.id} className="hover-scale">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h4 className="font-semibold">{listing.title}</h4>
                        <p className="text-sm text-muted-foreground">{listing.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Donor: {(listing.profiles as any)?.full_name}</span>
                          <span>•</span>
                          <span>Quantity: {listing.quantity}</span>
                          <span>•</span>
                          <span>{format(new Date(listing.created_at), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getStatusColor(listing.status)}>
                          {listing.status}
                        </Badge>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => deleteListing(listing.id)}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="claims" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Recent Claims</h3>
              <Button onClick={() => exportData('claims')} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <div className="space-y-4">
              {recentClaims.map((claim) => (
                <Card key={claim.id} className="hover-scale">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h4 className="font-semibold">{(claim.food_listings as any)?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Location: {(claim.food_listings as any)?.pickup_location}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Claimed by: {(claim.profiles as any)?.full_name}</span>
                          <span>•</span>
                          <span>{format(new Date(claim.claimed_at), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(claim.status || 'pending')}>
                        {claim.status || 'pending'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Platform Users</h3>
              <div className="flex items-center gap-2">
                <Button onClick={refresh} variant="ghost">
                  <Activity className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button onClick={() => exportData('users')} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.slice(0, 12).map((user) => (
                <Card key={user.id} className="hover-scale">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{user.full_name}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                          {user.role}
                        </Badge>
                        <div className="flex gap-2">
                          {user.role !== 'admin' ? (
                            <Button size="sm" variant="ghost" onClick={() => changeUserRole((user.user_id as string) || (user.id as string), 'admin')}>Make Admin</Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => changeUserRole((user.user_id as string) || (user.id as string), 'user')}>Revoke Admin</Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => deleteUser((user.user_id as string) || (user.id as string))}>Delete</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {users.length > 12 && (
              <div className="text-center">
                <p className="text-muted-foreground">
                  Showing 12 of {users.length} users. Export CSV for complete list.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
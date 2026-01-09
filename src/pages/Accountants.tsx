import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserCircle, Mail, Calendar, Search, Shield, ShieldCheck } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'accountant';
  created_at: string;
}

export default function Accountants() {
  const { isAdmin, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchProfiles();
    }
  }, [isAdmin]);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProfiles(data as Profile[]);
    }
    setLoading(false);
  };

  const toggleRole = async (profile: Profile) => {
    if (profile.user_id === currentProfile?.user_id) {
      toast({
        title: 'غير مسموح',
        description: 'لا يمكنك تغيير صلاحياتك الخاصة',
        variant: 'destructive',
      });
      return;
    }

    const newRole = profile.role === 'admin' ? 'accountant' : 'admin';
    
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profile.id);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الصلاحية',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'تم التحديث',
        description: `تم تغيير الصلاحية إلى ${newRole === 'admin' ? 'مدير' : 'محاسب'}`,
      });
      fetchProfiles();
    }
  };

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredProfiles = profiles.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">المحاسبين</h1>
        <p className="text-muted-foreground">إدارة المستخدمين والصلاحيات</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    profile.role === 'admin' ? 'bg-primary' : 'bg-secondary'
                  }`}>
                    <UserCircle className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{profile.full_name}</CardTitle>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      profile.role === 'admin'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary/50 text-secondary-foreground'
                    }`}>
                      {profile.role === 'admin' ? (
                        <>
                          <ShieldCheck className="w-3 h-3" />
                          مدير
                        </>
                      ) : (
                        <>
                          <Shield className="w-3 h-3" />
                          محاسب
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(profile.created_at).toLocaleDateString('ar-SA')}</span>
                </div>
                
                {profile.user_id !== currentProfile?.user_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => toggleRole(profile)}
                  >
                    {profile.role === 'admin' ? 'تحويل إلى محاسب' : 'ترقية إلى مدير'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

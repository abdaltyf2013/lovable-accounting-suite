 import { Navigate, Outlet } from 'react-router-dom';
 import { useAuth } from '@/contexts/AuthContext';
 import Sidebar from './Sidebar';
 import { Loader2 } from 'lucide-react';
 import NotificationBell from '@/components/notifications/NotificationBell';

export default function MainLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-6 lg:pr-8 overflow-auto">
         {/* Header with notifications */}
         <div className="fixed top-4 left-4 z-40 lg:static lg:flex lg:justify-end lg:mb-4">
           <div className="bg-background/80 backdrop-blur-sm rounded-xl p-1 shadow-lg lg:shadow-none lg:bg-transparent lg:backdrop-blur-none">
             <NotificationBell />
           </div>
         </div>
        <div className="max-w-7xl mx-auto pt-14 lg:pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

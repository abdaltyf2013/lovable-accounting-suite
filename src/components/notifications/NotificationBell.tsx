 import { useState, useEffect } from 'react';
 import { Bell, FileText, Wallet, CheckCircle, LogIn, Clock, X } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from '@/components/ui/popover';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { cn } from '@/lib/utils';
 import { format, formatDistanceToNow } from 'date-fns';
 import { ar } from 'date-fns/locale';
 
 interface Notification {
   id: string;
   type: string;
   title: string;
   message: string;
   is_read: boolean;
   created_at: string;
   data?: Record<string, unknown>;
   user_id?: string | null;
   for_role?: string | null;
 }
 
 const getNotificationIcon = (type: string) => {
   switch (type) {
     case 'invoice':
       return <FileText className="w-4 h-4 text-primary" />;
     case 'debt_due':
       return <Wallet className="w-4 h-4 text-destructive" />;
     case 'task_completed':
       return <CheckCircle className="w-4 h-4 text-success" />;
     case 'login':
       return <LogIn className="w-4 h-4 text-info" />;
     case 'overdue_task':
       return <Clock className="w-4 h-4 text-warning" />;
     default:
       return <Bell className="w-4 h-4" />;
   }
 };
 
 export default function NotificationBell() {
   const { user, isAdmin, isBranchManagerOrAdmin, userRole } = useAuth();
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const [open, setOpen] = useState(false);
   const [loading, setLoading] = useState(false);
 
   const unreadCount = notifications.filter(n => !n.is_read).length;
 
   const fetchNotifications = async () => {
     if (!user) return;
     
     setLoading(true);
     try {
       // Build query based on role
       let query = supabase
         .from('notifications')
         .select('*')
         .order('created_at', { ascending: false })
         .limit(50);
 
       // For accountants, only fetch their personal notifications
       if (!isAdmin && !isBranchManagerOrAdmin) {
         query = query.eq('user_id', user.id);
       }
 
       const { data, error } = await query;
 
       if (error) {
         console.error('Error fetching notifications:', error);
         return;
       }
 
       // Filter notifications based on role
       let filteredData = data || [];
       
       if (isBranchManagerOrAdmin && !isAdmin) {
         // Branch manager: exclude debt notifications
         filteredData = filteredData.filter(n => n.type !== 'debt_due');
       }
 
       setNotifications(filteredData as Notification[]);
     } catch (error) {
       console.error('Error:', error);
     } finally {
       setLoading(false);
     }
   };
 
   const markAsRead = async (id: string) => {
     const { error } = await supabase
       .from('notifications')
       .update({ is_read: true })
       .eq('id', id);
 
     if (!error) {
       setNotifications(prev => 
         prev.map(n => n.id === id ? { ...n, is_read: true } : n)
       );
     }
   };
 
   const markAllAsRead = async () => {
     const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
     if (unreadIds.length === 0) return;
 
     const { error } = await supabase
       .from('notifications')
       .update({ is_read: true })
       .in('id', unreadIds);
 
     if (!error) {
       setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
     }
   };
 
   const deleteNotification = async (id: string) => {
     const { error } = await supabase
       .from('notifications')
       .delete()
       .eq('id', id);
 
     if (!error) {
       setNotifications(prev => prev.filter(n => n.id !== id));
     }
   };
 
   // Create login notification
   const createLoginNotification = async () => {
     if (!user) return;
 
     // Check if we already logged this session
     const sessionKey = `login_notified_${user.id}`;
     if (sessionStorage.getItem(sessionKey)) return;
 
     const now = new Date();
     const timeStr = format(now, 'hh:mm a', { locale: ar });
     const dateStr = format(now, 'yyyy/MM/dd');
 
     // Create notification for the user themselves
     await supabase.from('notifications').insert({
       user_id: user.id,
       type: 'login',
       title: 'تسجيل دخول',
       message: `تم تسجيل الدخول بحسابك الساعة ${timeStr} يوم ${dateStr}`,
       for_role: null
     });
 
     // If user is accountant, notify admins
     if (userRole === 'accountant') {
       const { data: profile } = await supabase
         .from('profiles')
         .select('full_name')
         .eq('user_id', user.id)
         .single();
 
       const userName = profile?.full_name || 'محاسب';
 
       await supabase.from('notifications').insert({
         user_id: null,
         type: 'login',
         title: 'تسجيل دخول محاسب',
         message: `تم تسجيل الدخول من قبل ${userName} الساعة ${timeStr}`,
         for_role: 'admin'
       });
     }
 
     sessionStorage.setItem(sessionKey, 'true');
   };
 
   // Fetch overdue tasks for accountants
   const checkOverdueTasks = async () => {
     if (!user || isAdmin || isBranchManagerOrAdmin) return;
 
     const today = new Date().toISOString().split('T')[0];
     
     const { data: overdueTasks } = await supabase
       .from('tasks')
       .select('id, title, due_date')
       .eq('started_by', user.id)
       .lt('due_date', today)
       .in('status', ['pending', 'in_progress']);
 
     if (overdueTasks && overdueTasks.length > 0) {
       // Check if we already have an overdue notification today
       const { data: existingNotif } = await supabase
         .from('notifications')
         .select('id')
         .eq('user_id', user.id)
         .eq('type', 'overdue_task')
         .gte('created_at', today)
         .limit(1);
 
       if (!existingNotif || existingNotif.length === 0) {
         await supabase.from('notifications').insert({
           user_id: user.id,
           type: 'overdue_task',
           title: 'مهام متأخرة',
           message: `لديك ${overdueTasks.length} مهام متأخرة تحتاج إلى متابعة`,
           for_role: null
         });
       }
     }
   };
 
   // Check due debts for admin
   const checkDueDebts = async () => {
     if (!isAdmin) return;
 
     const today = new Date().toISOString().split('T')[0];
     
     const { data: dueDebts } = await supabase
       .from('debts')
       .select('id, client_name, amount, expected_payment_date')
       .eq('expected_payment_date', today)
       .eq('status', 'pending');
 
     if (dueDebts && dueDebts.length > 0) {
       // Check if we already have a debt notification today
       const { data: existingNotif } = await supabase
         .from('notifications')
         .select('id')
         .eq('type', 'debt_due')
         .gte('created_at', today)
         .limit(1);
 
       if (!existingNotif || existingNotif.length === 0) {
         for (const debt of dueDebts) {
           await supabase.from('notifications').insert({
             user_id: null,
             type: 'debt_due',
             title: 'دين مستحق اليوم',
             message: `يوجد دين مستحق اليوم على ${debt.client_name} بقيمة ${debt.amount.toLocaleString()} ر.س`,
             for_role: 'admin',
             data: { debt_id: debt.id }
           });
         }
       }
     }
   };
 
   useEffect(() => {
     if (user) {
       fetchNotifications();
       createLoginNotification();
       checkOverdueTasks();
       checkDueDebts();
 
       // Subscribe to realtime notifications
       const channel = supabase
         .channel('notifications')
         .on(
           'postgres_changes',
           {
             event: 'INSERT',
             schema: 'public',
             table: 'notifications',
           },
           (payload) => {
             const newNotif = payload.new as Notification;
             // Check if this notification is for current user
             if (newNotif.user_id === user.id || 
                 (isAdmin && newNotif.for_role === 'admin') ||
                 (isBranchManagerOrAdmin && newNotif.for_role === 'branch_manager' && newNotif.type !== 'debt_due')) {
               setNotifications(prev => [newNotif, ...prev]);
             }
           }
         )
         .subscribe();
 
       return () => {
         supabase.removeChannel(channel);
       };
     }
   }, [user, isAdmin, isBranchManagerOrAdmin]);
 
   return (
     <Popover open={open} onOpenChange={setOpen}>
       <PopoverTrigger asChild>
         <Button
           variant="ghost"
           size="icon"
           className="relative"
         >
           <Bell className="w-5 h-5" />
           {unreadCount > 0 && (
             <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
               {unreadCount > 9 ? '9+' : unreadCount}
             </span>
           )}
         </Button>
       </PopoverTrigger>
       <PopoverContent 
         className="w-80 p-0" 
         align="end"
         sideOffset={8}
       >
         <div className="flex items-center justify-between p-3 border-b">
           <h4 className="font-semibold">التنبيهات</h4>
           {unreadCount > 0 && (
             <Button
               variant="ghost"
               size="sm"
               className="text-xs h-7"
               onClick={markAllAsRead}
             >
               تحديد الكل كمقروء
             </Button>
           )}
         </div>
         
         <ScrollArea className="h-[300px]">
           {loading ? (
             <div className="flex items-center justify-center h-20">
               <span className="text-muted-foreground text-sm">جاري التحميل...</span>
             </div>
           ) : notifications.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
               <Bell className="w-8 h-8 mb-2 opacity-50" />
               <span className="text-sm">لا توجد تنبيهات</span>
             </div>
           ) : (
             <div className="divide-y">
               {notifications.map((notification) => (
                 <div
                   key={notification.id}
                   className={cn(
                     'p-3 hover:bg-muted/50 cursor-pointer transition-colors relative group',
                     !notification.is_read && 'bg-primary/5'
                   )}
                   onClick={() => markAsRead(notification.id)}
                 >
                   <div className="flex gap-3">
                     <div className="flex-shrink-0 mt-0.5">
                       {getNotificationIcon(notification.type)}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-medium">{notification.title}</p>
                       <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                         {notification.message}
                       </p>
                       <p className="text-xs text-muted-foreground/70 mt-1">
                         {formatDistanceToNow(new Date(notification.created_at), {
                           addSuffix: true,
                           locale: ar
                         })}
                       </p>
                     </div>
                     {!notification.is_read && (
                       <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                     )}
                   </div>
                   {isAdmin && (
                     <Button
                       variant="ghost"
                       size="icon"
                       className="absolute top-1 left-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                       onClick={(e) => {
                         e.stopPropagation();
                         deleteNotification(notification.id);
                       }}
                     >
                       <X className="w-3 h-3" />
                     </Button>
                   )}
                 </div>
               ))}
             </div>
           )}
         </ScrollArea>
       </PopoverContent>
     </Popover>
   );
 }
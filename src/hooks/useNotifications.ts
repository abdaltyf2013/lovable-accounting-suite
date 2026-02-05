 import { useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 
 export function useNotifications() {
   const { user, profile } = useAuth();
 
   const notifyInvoiceCreated = useCallback(async (
     invoiceNumber: string,
     clientName: string,
     amount: number,
     type: 'sales' | 'purchase'
   ) => {
     if (!user || !profile) return;
 
     const typeLabel = type === 'sales' ? 'مبيعات' : 'مصروفات';
     
     await supabase.from('notifications').insert({
       user_id: null,
       type: 'invoice',
       title: 'فاتورة جديدة',
       message: `${profile.full_name} أصدر فاتورة ${typeLabel} رقم ${invoiceNumber} بقيمة ${amount.toLocaleString()} ر.س للعميل ${clientName}`,
       for_role: 'admin'
     });
   }, [user, profile]);
 
   const notifyTaskCompleted = useCallback(async (
     taskTitle: string,
     clientName: string
   ) => {
     if (!user || !profile) return;
 
     await supabase.from('notifications').insert({
       user_id: null,
       type: 'task_completed',
       title: 'مهمة مكتملة',
       message: `تم إنهاء مهمة "${taskTitle}" للعميل ${clientName} من قبل ${profile.full_name}`,
       for_role: 'admin'
     });
   }, [user, profile]);
 
   return {
     notifyInvoiceCreated,
     notifyTaskCompleted
   };
 }
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'invoice', 'debt_due', 'task_completed', 'login', 'overdue_task'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  for_role TEXT, -- 'admin', 'branch_manager', 'accountant', or NULL for specific user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view all notifications meant for admins
CREATE POLICY "Admins can view admin notifications"
ON public.notifications
FOR SELECT
USING (
  is_admin(auth.uid()) AND (for_role = 'admin' OR for_role IS NULL)
);

-- Branch managers can view their notifications (excluding debt notifications)
CREATE POLICY "Branch managers can view their notifications"
ON public.notifications
FOR SELECT
USING (
  is_branch_manager_or_admin(auth.uid()) 
  AND (for_role = 'branch_manager' OR for_role = 'admin')
  AND type != 'debt_due'
);

-- Users can view their own personal notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Authenticated users can insert notifications
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Admins can delete notifications
CREATE POLICY "Admins can delete notifications"
ON public.notifications
FOR DELETE
USING (is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_for_role ON public.notifications(for_role);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
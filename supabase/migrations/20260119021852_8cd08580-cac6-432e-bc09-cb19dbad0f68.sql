
-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    client_name TEXT NOT NULL,
    phone TEXT,
    due_date DATE NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    started_by UUID REFERENCES auth.users(id),
    started_by_name TEXT,
    total_work_time INTEGER NOT NULL DEFAULT 0, -- in seconds, excludes pause time
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create task time logs table (for tracking start/pause/resume/complete)
CREATE TABLE public.task_time_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'started', 'paused', 'resumed', 'completed', 'cancelled')),
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task notes table
CREATE TABLE public.task_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_by_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;

-- Tasks policies - all authenticated users can view and manage tasks
CREATE POLICY "Authenticated users can view all tasks" ON public.tasks
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert tasks" ON public.tasks
FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks" ON public.tasks
FOR UPDATE USING (true);

CREATE POLICY "Only admins can delete tasks" ON public.tasks
FOR DELETE USING (is_admin(auth.uid()));

-- Task time logs policies
CREATE POLICY "Authenticated users can view task logs" ON public.task_time_logs
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert task logs" ON public.task_time_logs
FOR INSERT WITH CHECK (true);

-- Task notes policies
CREATE POLICY "Authenticated users can view task notes" ON public.task_notes
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert task notes" ON public.task_notes
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own notes or admins" ON public.task_notes
FOR DELETE USING (created_by = auth.uid() OR is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

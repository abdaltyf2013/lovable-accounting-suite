import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";
import { Plus, Play, Pause, CheckCircle2, XCircle, Clock, MessageSquare, Printer, Filter, User, Calendar, Phone, AlertCircle, Edit, ChevronDown, ChevronUp, ListTodo, CheckCheck, Ban, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

interface Task {
  id: string;
  title: string;
  description: string | null;
  client_name: string;
  phone: string | null;
  due_date: string;
  priority: Priority;
  status: TaskStatus;
  created_by: string | null;
  started_by: string | null;
  started_by_name: string | null;
  total_work_time: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

interface TaskNote {
  id: string;
  task_id: string;
  note: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface TaskTimeLog {
  id: string;
  task_id: string;
  action: string;
  user_id: string | null;
  user_name: string | null;
  notes: string | null;
  created_at: string;
}

const priorityConfig = {
  low: { label: 'منخفضة', color: 'bg-slate-100 text-slate-700' },
  medium: { label: 'متوسطة', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'عالية', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'عاجلة', color: 'bg-red-100 text-red-700' }
};

const statusConfig = {
  pending: { label: 'في الانتظار', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-700' },
  paused: { label: 'متوقفة', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'مكتملة', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ملغاة', color: 'bg-red-100 text-red-700' }
};

const Tasks = () => {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskNotes, setTaskNotes] = useState<TaskNote[]>([]);
  const [taskLogs, setTaskLogs] = useState<TaskTimeLog[]>([]);
  const [newNote, setNewNote] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState<'priority' | 'date'>('priority');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ title: "", description: "", client_name: "", phone: "", due_date: "", priority: "medium" as Priority });

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTasks((data || []) as Task[]);
    } catch { toast.error("خطأ في تحميل المهام"); }
    finally { setLoading(false); }
  };

  const getTaskAgeColor = (createdAt: string) => {
    const days = differenceInDays(new Date(), new Date(createdAt));
    if (days >= 3) return 'border-r-4 border-r-red-500 bg-red-50/50';
    if (days >= 2) return 'border-r-4 border-r-orange-500 bg-orange-50/50';
    return 'border-r-4 border-r-green-500 bg-green-50/50';
  };

  const sortTasks = (tasksToSort: Task[]) => [...tasksToSort].sort((a, b) => {
    // أولاً: الترتيب حسب الحالة (المكتملة والملغاة في الأسفل)
    const isFinished = (status: string) => status === 'completed' || status === 'cancelled';
    if (isFinished(a.status) && !isFinished(b.status)) return 1;
    if (!isFinished(a.status) && isFinished(b.status)) return -1;

    // ثانياً: الترتيب المختار (الأولوية أو التاريخ) داخل كل مجموعة
    if (sortBy === 'priority') {
      const priorityMap = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filterTasks = () => {
    let filtered = tasks;
    if (activeTab === 'pending') filtered = tasks.filter(t => ['pending', 'in_progress', 'paused'].includes(t.status));
    else if (activeTab === 'completed') filtered = tasks.filter(t => t.status === 'completed');
    else if (activeTab === 'cancelled') filtered = tasks.filter(t => t.status === 'cancelled');
    return sortTasks(filtered);
  };

  const handleAddTask = async () => {
    if (!formData.title || !formData.client_name || !formData.due_date) { toast.error("يرجى ملء الحقول المطلوبة"); return; }
    try {
      const { data, error } = await supabase.from('tasks').insert({ ...formData, created_by: user?.id }).select().single();
      if (error) throw error;
      await supabase.from('task_time_logs').insert({ task_id: data.id, action: 'created', user_id: user?.id, user_name: profile?.full_name });
      toast.success("تم إضافة المهمة"); setIsAddDialogOpen(false); setFormData({ title: "", description: "", client_name: "", phone: "", due_date: "", priority: "medium" }); fetchTasks();
    } catch { toast.error("خطأ في إضافة المهمة"); }
  };

  const handleEditTask = async () => {
    if (!selectedTask) return;
    try {
      const { error } = await supabase.from('tasks').update({ title: formData.title, description: formData.description, client_name: formData.client_name, phone: formData.phone, due_date: formData.due_date, priority: formData.priority }).eq('id', selectedTask.id);
      if (error) throw error;
      toast.success("تم تحديث المهمة"); setIsEditDialogOpen(false); fetchTasks();
    } catch { toast.error("خطأ في تحديث المهمة"); }
  };

  const handleStartTask = async (task: Task) => {
    try {
      await supabase.from('tasks').update({ status: 'in_progress', started_by: user?.id, started_by_name: profile?.full_name, started_at: new Date().toISOString() }).eq('id', task.id);
      await supabase.from('task_time_logs').insert({ task_id: task.id, action: 'started', user_id: user?.id, user_name: profile?.full_name });
      toast.success("تم بدء المهمة"); fetchTasks();
    } catch { toast.error("خطأ"); }
  };

  const handlePauseTask = async (task: Task) => {
    try {
      const lastLog = await supabase.from('task_time_logs').select('*').eq('task_id', task.id).in('action', ['started', 'resumed']).order('created_at', { ascending: false }).limit(1).single();
      const additionalTime = lastLog.data ? Math.floor((new Date().getTime() - new Date(lastLog.data.created_at).getTime()) / 1000) : 0;
      await supabase.from('tasks').update({ status: 'paused', total_work_time: task.total_work_time + additionalTime }).eq('id', task.id);
      await supabase.from('task_time_logs').insert({ task_id: task.id, action: 'paused', user_id: user?.id, user_name: profile?.full_name, notes: 'إيقاف مؤقت' });
      toast.success("تم إيقاف المهمة مؤقتاً"); fetchTasks();
    } catch { toast.error("خطأ"); }
  };

  const handleResumeTask = async (task: Task) => {
    try {
      await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', task.id);
      await supabase.from('task_time_logs').insert({ task_id: task.id, action: 'resumed', user_id: user?.id, user_name: profile?.full_name });
      toast.success("تم استئناف المهمة"); fetchTasks();
    } catch { toast.error("خطأ"); }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      let additionalTime = 0;
      if (task.status === 'in_progress') {
        const lastLog = await supabase.from('task_time_logs').select('*').eq('task_id', task.id).in('action', ['started', 'resumed']).order('created_at', { ascending: false }).limit(1).single();
        if (lastLog.data) additionalTime = Math.floor((new Date().getTime() - new Date(lastLog.data.created_at).getTime()) / 1000);
      }
      await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString(), total_work_time: task.total_work_time + additionalTime }).eq('id', task.id);
      await supabase.from('task_time_logs').insert({ task_id: task.id, action: 'completed', user_id: user?.id, user_name: profile?.full_name });
      toast.success("تم إكمال المهمة"); fetchTasks();
    } catch { toast.error("خطأ"); }
  };

  const handleCancelTask = async (task: Task) => {
    try {
      await supabase.from('tasks').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', task.id);
      await supabase.from('task_time_logs').insert({ task_id: task.id, action: 'cancelled', user_id: user?.id, user_name: profile?.full_name });
      toast.success("تم إلغاء المهمة"); setIsCancelDialogOpen(false); fetchTasks();
    } catch { toast.error("خطأ"); }
  };

  const openCancelDialog = (task: Task) => {
    setSelectedTask(task);
    setIsCancelDialogOpen(true);
  };

  const openNotesDialog = async (task: Task) => {
    setSelectedTask(task); setIsNotesDialogOpen(true);
    const { data } = await supabase.from('task_notes').select('*').eq('task_id', task.id).order('created_at', { ascending: false });
    setTaskNotes(data || []);
  };

  const openLogsDialog = async (task: Task) => {
    setSelectedTask(task); setIsLogsDialogOpen(true);
    const { data } = await supabase.from('task_time_logs').select('*').eq('task_id', task.id).order('created_at', { ascending: false });
    setTaskLogs(data || []);
  };

  const handleAddNote = async () => {
    if (!selectedTask || !newNote.trim()) return;
    try {
      await supabase.from('task_notes').insert({ task_id: selectedTask.id, note: newNote, created_by: user?.id, created_by_name: profile?.full_name });
      toast.success("تم إضافة الملاحظة"); setNewNote(""); openNotesDialog(selectedTask);
    } catch { toast.error("خطأ"); }
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setFormData({ title: task.title, description: task.description || "", client_name: task.client_name, phone: task.phone || "", due_date: task.due_date, priority: task.priority });
    setIsEditDialogOpen(true);
  };

  const formatWorkTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours} ساعة ${minutes} دقيقة` : `${minutes} دقيقة`;
  };

  const stats = { pending: tasks.filter(t => ['pending', 'in_progress', 'paused'].includes(t.status)).length, completed: tasks.filter(t => t.status === 'completed').length, cancelled: tasks.filter(t => t.status === 'cancelled').length, total: tasks.length };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const filteredTasks = filterTasks();
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>قائمة المهام</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:right}th{background:#f5f5f5}</style></head><body><h1>قائمة المهام</h1><table><thead><tr><th>العنوان</th><th>العميل</th><th>الأولوية</th><th>الحالة</th><th>تاريخ التسليم</th><th>المنفذ</th></tr></thead><tbody>${filteredTasks.map(t => `<tr><td>${t.title}</td><td>${t.client_name}</td><td>${priorityConfig[t.priority].label}</td><td>${statusConfig[t.status].label}</td><td>${format(new Date(t.due_date), 'yyyy/MM/dd')}</td><td>${t.started_by_name || '-'}</td></tr>`).join('')}</tbody></table></body></html>`);
    printWindow.document.close(); printWindow.print();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">إدارة المهام</h1>
          <p className="text-muted-foreground mt-1">متابعة وإدارة مهام العملاء</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handlePrint} variant="outline" size="sm"><Printer className="w-4 h-4 ml-2" />طباعة</Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 ml-2" />مهمة جديدة</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>إضافة مهمة جديدة</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label>العنوان *</Label><Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="عنوان المهمة" /></div>
                <div><Label>اسم العميل *</Label><Input value={formData.client_name} onChange={(e) => setFormData(p => ({ ...p, client_name: e.target.value }))} placeholder="اسم العميل" /></div>
                <div><Label>رقم الجوال</Label><Input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="05xxxxxxxx" dir="ltr" /></div>
                <div><Label>الوصف</Label><Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>تاريخ التسليم *</Label><Input type="date" value={formData.due_date} onChange={(e) => setFormData(p => ({ ...p, due_date: e.target.value }))} /></div>
                  <div><Label>الأولوية</Label><Select value={formData.priority} onValueChange={(v: Priority) => setFormData(p => ({ ...p, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">منخفضة</SelectItem><SelectItem value="medium">متوسطة</SelectItem><SelectItem value="high">عالية</SelectItem><SelectItem value="urgent">عاجلة</SelectItem></SelectContent></Select></div>
                </div>
                <Button onClick={handleAddTask} className="w-full">إضافة المهمة</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><ListTodo className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">إجمالي المهام</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-100"><Clock className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{stats.pending}</p><p className="text-xs text-muted-foreground">قيد التنفيذ</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-100"><CheckCheck className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold">{stats.completed}</p><p className="text-xs text-muted-foreground">مكتملة</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-100"><Ban className="w-5 h-5 text-red-600" /></div><div><p className="text-2xl font-bold">{stats.cancelled}</p><p className="text-xs text-muted-foreground">ملغاة</p></div></div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}><TabsList className="grid grid-cols-4"><TabsTrigger value="all">الكل</TabsTrigger><TabsTrigger value="pending">متبقية</TabsTrigger><TabsTrigger value="completed">مكتملة</TabsTrigger><TabsTrigger value="cancelled">ملغاة</TabsTrigger></TabsList></Tabs>
        <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-muted-foreground" /><Select value={sortBy} onValueChange={(v: 'priority' | 'date') => setSortBy(v)}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="priority">حسب الأولوية</SelectItem><SelectItem value="date">حسب التاريخ</SelectItem></SelectContent></Select></div>
      </div>

      <div className="space-y-3">
        {filterTasks().length === 0 ? (
          <Card><CardContent className="py-12 text-center"><ListTodo className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">لا توجد مهام</p></CardContent></Card>
        ) : filterTasks().map((task) => (
          <Card key={task.id} className={`transition-all border-2 dark:bg-slate-900/50 ${getTaskAgeColor(task.created_at)}`}>
            <Collapsible open={expandedTasks.has(task.id)} onOpenChange={() => setExpandedTasks(prev => { const s = new Set(prev); s.has(task.id) ? s.delete(task.id) : s.add(task.id); return s; })}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-foreground truncate">{task.title}</h3>
                      <Badge className={priorityConfig[task.priority].color}>{priorityConfig[task.priority].label}</Badge>
                      <Badge className={statusConfig[task.status].color}>{statusConfig[task.status].label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-foreground/80 dark:text-white/90">
                      <span className="flex items-center gap-1 font-medium"><User className="w-4 h-4 text-primary" />{task.client_name}</span>
                      {task.phone && <span className="flex items-center gap-1 font-medium"><Phone className="w-4 h-4 text-primary" />{task.phone}</span>}
                      <span className="flex items-center gap-1 font-medium"><Calendar className="w-4 h-4 text-primary" />{format(new Date(task.due_date), 'yyyy/MM/dd')}</span>
                      {task.started_by_name && <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold"><AlertCircle className="w-4 h-4" />المنفذ: {task.started_by_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.status === 'pending' && <Button size="sm" variant="outline" onClick={() => handleStartTask(task)}><Play className="w-4 h-4 ml-1" />بدء</Button>}
                    {task.status === 'in_progress' && <><Button size="sm" variant="outline" onClick={() => handlePauseTask(task)}><Pause className="w-4 h-4 ml-1" />إيقاف</Button><Button size="sm" onClick={() => handleCompleteTask(task)}><CheckCircle2 className="w-4 h-4 ml-1" />إكمال</Button></>}
                    {task.status === 'paused' && <><Button size="sm" variant="outline" onClick={() => handleResumeTask(task)}><RotateCcw className="w-4 h-4 ml-1" />استئناف</Button><Button size="sm" onClick={() => handleCompleteTask(task)}><CheckCircle2 className="w-4 h-4 ml-1" />إكمال</Button></>}
                    {['pending', 'in_progress', 'paused'].includes(task.status) && <><Button size="sm" variant="ghost" onClick={() => openEditDialog(task)}><Edit className="w-4 h-4" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => openCancelDialog(task)}><XCircle className="w-4 h-4" /></Button></>}
                    <Button size="sm" variant="ghost" onClick={() => openNotesDialog(task)}><MessageSquare className="w-4 h-4" /></Button>
                    <CollapsibleTrigger asChild><Button size="sm" variant="ghost">{expandedTasks.has(task.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</Button></CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {task.description && <div><p className="text-sm font-medium text-muted-foreground mb-1">الوصف:</p><p className="text-sm">{task.description}</p></div>}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div><span className="text-muted-foreground">تاريخ الإضافة: </span>{format(new Date(task.created_at), 'yyyy/MM/dd HH:mm', { locale: ar })}</div>
                      {task.total_work_time > 0 && <div><span className="text-muted-foreground">وقت العمل: </span>{formatWorkTime(task.total_work_time)}</div>}
                      {task.completed_at && <div><span className="text-muted-foreground">تاريخ الإكمال: </span>{format(new Date(task.completed_at), 'yyyy/MM/dd HH:mm', { locale: ar })}</div>}
                    </div>
                    <Button size="sm" variant="link" className="p-0" onClick={() => openLogsDialog(task)}><Clock className="w-4 h-4 ml-1" />عرض سجل العمليات</Button>
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تعديل المهمة</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>العنوان</Label><Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>اسم العميل</Label><Input value={formData.client_name} onChange={(e) => setFormData(p => ({ ...p, client_name: e.target.value }))} /></div>
            <div><Label>رقم الجوال</Label><Input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} dir="ltr" /></div>
            <div><Label>الوصف</Label><Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>تاريخ التسليم</Label><Input type="date" value={formData.due_date} onChange={(e) => setFormData(p => ({ ...p, due_date: e.target.value }))} /></div>
              <div><Label>الأولوية</Label><Select value={formData.priority} onValueChange={(v: Priority) => setFormData(p => ({ ...p, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">منخفضة</SelectItem><SelectItem value="medium">متوسطة</SelectItem><SelectItem value="high">عالية</SelectItem><SelectItem value="urgent">عاجلة</SelectItem></SelectContent></Select></div>
            </div>
            <Button onClick={handleEditTask} className="w-full">حفظ التعديلات</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ملاحظات المهمة</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex gap-2"><Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="أضف ملاحظة..." onKeyPress={(e) => e.key === 'Enter' && handleAddNote()} /><Button onClick={handleAddNote}>إضافة</Button></div>
            <ScrollArea className="h-[300px]">
              {taskNotes.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد ملاحظات</p> : <div className="space-y-3">{taskNotes.map((note) => <Card key={note.id}><CardContent className="py-3"><p className="text-sm">{note.note}</p><p className="text-xs text-muted-foreground mt-2">{note.created_by_name} - {format(new Date(note.created_at), 'yyyy/MM/dd HH:mm', { locale: ar })}</p></CardContent></Card>)}</div>}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تأكيد إلغاء المهمة</DialogTitle></DialogHeader>
          <div className="py-6 text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <p className="text-lg font-medium mb-2">هل أنت متأكد من إلغاء هذه المهمة؟</p>
            <p className="text-muted-foreground">لا يمكن التراجع عن هذا الإجراء بعد التأكيد.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsCancelDialogOpen(false)}>تراجع</Button>
            <Button variant="destructive" className="flex-1" onClick={() => selectedTask && handleCancelTask(selectedTask)}>تأكيد الإلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>سجل العمليات</DialogTitle></DialogHeader>
          <ScrollArea className="h-[400px] mt-4">
            {taskLogs.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد عمليات</p> : <div className="space-y-3">{taskLogs.map((log) => <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"><div className="w-2 h-2 rounded-full bg-primary mt-2"></div><div className="flex-1"><p className="text-sm font-medium">{log.action === 'created' ? 'تم إنشاء المهمة' : log.action === 'started' ? 'تم بدء المهمة' : log.action === 'paused' ? 'تم إيقاف المهمة مؤقتاً' : log.action === 'resumed' ? 'تم استئناف المهمة' : log.action === 'completed' ? 'تم إكمال المهمة' : 'تم إلغاء المهمة'}</p>{log.notes && <p className="text-sm text-muted-foreground">{log.notes}</p>}<p className="text-xs text-muted-foreground mt-1">{log.user_name} - {format(new Date(log.created_at), 'yyyy/MM/dd HH:mm', { locale: ar })}</p></div></div>)}</div>}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;

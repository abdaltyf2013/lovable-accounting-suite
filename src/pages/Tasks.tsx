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
import { Plus, Play, Pause, CheckCircle2, XCircle, Clock, MessageSquare, Printer, Filter, User, Calendar, Phone, AlertCircle, Edit, ChevronDown, ChevronUp, ListTodo, CheckCheck, Ban, RotateCcw, UserPlus, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

interface Task {
  id: string;
  title: string;
  description: string | null;
  client_name: string;
  client_id: string | null;
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
  service_amount: number;
  government_fees: number;
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

interface Client {
  id: string;
  name: string;
  phone: string | null;
}

const priorityConfig = {
  low: { label: 'منخفضة', color: 'bg-slate-100 text-slate-700' },
  medium: { label: 'متوسطة', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'عالية', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'عاجلة', color: 'bg-red-100 text-red-700' }
};

const statusConfig = {
  pending: { label: 'في الانتظار', color: 'bg-gray-100 text-gray-700', cardBg: '' },
  in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-700', cardBg: '' },
  paused: { label: 'متوقفة', color: 'bg-yellow-100 text-yellow-700', cardBg: '' },
  completed: { label: 'مكتملة', color: 'bg-green-500 text-white', cardBg: 'bg-green-600 text-white' },
  cancelled: { label: 'ملغاة', color: 'bg-red-500 text-white', cardBg: 'bg-red-600 text-white' }
};

const Tasks = () => {
  const { user, profile, isAdmin } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskNotes, setTaskNotes] = useState<TaskNote[]>([]);
  const [taskLogs, setTaskLogs] = useState<TaskTimeLog[]>([]);
  const [newNote, setNewNote] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState<'priority' | 'date'>('priority');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ title: "", description: "", client_name: "", client_id: "", phone: "", due_date: "", priority: "medium" as Priority });
  
  // حالات نافذة الإنجاز
  const [completeFormData, setCompleteFormData] = useState({ service_amount: "", government_fees: "" });
  
  // حالات البحث عن العميل وإضافته
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  useEffect(() => { fetchTasks(); fetchClients(); }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTasks((data || []) as Task[]);
    } catch { toast.error("خطأ في تحميل المهام"); }
    finally { setLoading(false); }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from('clients').select('id, name, phone');
      if (error) throw error;
      setClients((data || []) as Client[]);
    } catch { console.error("خطأ في تحميل العملاء"); }
  };

  const getTaskAgeColor = (createdAt: string) => {
    const days = differenceInDays(new Date(), new Date(createdAt));
    if (days >= 3) return 'border-r-4 border-r-red-500 bg-red-50/50';
    if (days >= 2) return 'border-r-4 border-r-orange-500 bg-orange-50/50';
    return 'border-r-4 border-r-green-500 bg-green-50/50';
  };

  const sortTasks = (tasksToSort: Task[]) => [...tasksToSort].sort((a, b) => {
    const isFinished = (status: string) => status === 'completed' || status === 'cancelled';
    if (isFinished(a.status) && !isFinished(b.status)) return 1;
    if (!isFinished(a.status) && isFinished(b.status)) return -1;
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

  // إضافة عميل جديد سريعة
  const handleQuickAddClient = async () => {
    if (!newClientName.trim()) {
      toast.error("يرجى إدخال اسم العميل");
      return;
    }
    try {
      const { data, error } = await supabase.from('clients').insert({ name: newClientName.trim(), created_by: user?.id }).select().single();
      if (error) throw error;
      toast.success("تم إضافة العميل بنجاح");
      setClients([...clients, { id: data.id, name: data.name, phone: data.phone }]);
      setFormData(p => ({ ...p, client_id: data.id, client_name: data.name }));
      setNewClientName("");
      setIsAddingNewClient(false);
      setClientSearchOpen(false);
    } catch { toast.error("خطأ في إضافة العميل"); }
  };

  const handleSelectClient = (client: Client) => {
    setFormData(p => ({ ...p, client_id: client.id, client_name: client.name, phone: client.phone || p.phone }));
    setClientSearchOpen(false);
  };

  const handleAddTask = async () => {
    if (!formData.title || !formData.client_name || !formData.due_date) { toast.error("يرجى ملء الحقول المطلوبة"); return; }
    try {
      const { data, error } = await supabase.from('tasks').insert({ 
        title: formData.title,
        description: formData.description,
        client_name: formData.client_name,
        client_id: formData.client_id || null,
        phone: formData.phone,
        due_date: formData.due_date,
        priority: formData.priority,
        created_by: user?.id 
      }).select().single();
      if (error) throw error;
      await supabase.from('task_time_logs').insert({ task_id: data.id, action: 'created', user_id: user?.id, user_name: profile?.full_name });
      toast.success("تم إضافة المهمة"); 
      setIsAddDialogOpen(false); 
      setFormData({ title: "", description: "", client_name: "", client_id: "", phone: "", due_date: "", priority: "medium" }); 
      fetchTasks();
    } catch { toast.error("خطأ في إضافة المهمة"); }
  };

  const handleEditTask = async () => {
    if (!selectedTask) return;
    try {
      const { error } = await supabase.from('tasks').update({ 
        title: formData.title, 
        description: formData.description, 
        client_name: formData.client_name, 
        client_id: formData.client_id || null,
        phone: formData.phone, 
        due_date: formData.due_date, 
        priority: formData.priority 
      }).eq('id', selectedTask.id);
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

  // فتح نافذة الإكمال
  const openCompleteDialog = (task: Task) => {
    setSelectedTask(task);
    setCompleteFormData({ service_amount: "", government_fees: "" });
    setIsCompleteDialogOpen(true);
  };

  // إكمال المهمة مع الربط التلقائي
  const handleCompleteTaskWithFinancials = async () => {
    if (!selectedTask) return;
    
    const serviceAmount = parseFloat(completeFormData.service_amount) || 0;
    const governmentFees = parseFloat(completeFormData.government_fees) || 0;
    const totalAmount = serviceAmount + governmentFees;

    if (totalAmount <= 0) {
      toast.error("يرجى إدخال المبلغ");
      return;
    }

    try {
      // 1. حساب وقت العمل الإضافي إذا كانت المهمة قيد التنفيذ
      let additionalTime = 0;
      if (selectedTask.status === 'in_progress') {
        const lastLog = await supabase.from('task_time_logs').select('*').eq('task_id', selectedTask.id).in('action', ['started', 'resumed']).order('created_at', { ascending: false }).limit(1).single();
        if (lastLog.data) additionalTime = Math.floor((new Date().getTime() - new Date(lastLog.data.created_at).getTime()) / 1000);
      }

      // 2. تحديث المهمة
      await supabase.from('tasks').update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(), 
        total_work_time: selectedTask.total_work_time + additionalTime,
        service_amount: serviceAmount,
        government_fees: governmentFees
      }).eq('id', selectedTask.id);

      // 3. تسجيل في سجل العمليات
      await supabase.from('task_time_logs').insert({ task_id: selectedTask.id, action: 'completed', user_id: user?.id, user_name: profile?.full_name, notes: `المبلغ: ${totalAmount} ريال` });

      // 4. إنشاء دين جديد (إذا كان المستخدم admin)
      if (isAdmin) {
        await supabase.from('debts').insert({
          client_name: selectedTask.client_name,
          service_type: selectedTask.title,
          amount: totalAmount,
          paid_amount: 0,
          work_completion_date: new Date().toISOString().split('T')[0],
          expected_payment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: `مرتبط بمهمة: ${selectedTask.title}`,
          created_by: user?.id,
          task_id: selectedTask.id
        });
      }

      // 5. إنشاء فاتورة مبيعات
      const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`;
      const taxAmount = totalAmount * 0.15;
      const totalWithTax = totalAmount + taxAmount;

      const { data: invoiceData } = await supabase.from('invoices').insert({
        invoice_number: invoiceNumber,
        type: 'sales',
        client_id: selectedTask.client_id,
        client_name: selectedTask.client_name,
        amount: totalAmount,
        tax_amount: taxAmount,
        total_amount: totalWithTax,
        status: 'pending',
        notes: `فاتورة تلقائية من مهمة: ${selectedTask.title}`,
        accountant_name: profile?.full_name || user?.email,
        created_by: user?.id,
        task_id: selectedTask.id
      }).select().single();

      // 6. إضافة بنود الفاتورة
      if (invoiceData) {
        const invoiceItems = [];
        if (serviceAmount > 0) {
          invoiceItems.push({
            invoice_id: invoiceData.id,
            description: selectedTask.title,
            quantity: 1,
            unit_price: serviceAmount,
            total: serviceAmount
          });
        }
        if (governmentFees > 0) {
          invoiceItems.push({
            invoice_id: invoiceData.id,
            description: 'رسوم حكومية',
            quantity: 1,
            unit_price: governmentFees,
            total: governmentFees
          });
        }
        if (invoiceItems.length > 0) {
          await supabase.from('invoice_items').insert(invoiceItems);
        }
      }

      toast.success("تم إكمال المهمة وإنشاء الفاتورة والدين تلقائياً");
      setIsCompleteDialogOpen(false);
      fetchTasks();
    } catch (error) {
      console.error(error);
      toast.error("خطأ في إكمال المهمة");
    }
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
    setFormData({ title: task.title, description: task.description || "", client_name: task.client_name, client_id: task.client_id || "", phone: task.phone || "", due_date: task.due_date, priority: task.priority });
    setIsEditDialogOpen(true);
  };

  const formatWorkTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours} ساعة ${minutes} دقيقة` : `${minutes} دقيقة`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const stats = { pending: tasks.filter(t => ['pending', 'in_progress', 'paused'].includes(t.status)).length, completed: tasks.filter(t => t.status === 'completed').length, cancelled: tasks.filter(t => t.status === 'cancelled').length, total: tasks.length };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const filteredTasks = filterTasks();
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>قائمة المهام</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:right}th{background:#f5f5f5}</style></head><body><h1>قائمة المهام</h1><table><thead><tr><th>العنوان</th><th>العميل</th><th>الأولوية</th><th>الحالة</th><th>تاريخ التسليم</th><th>المنفذ</th></tr></thead><tbody>${filteredTasks.map(t => `<tr><td>${t.title}</td><td>${t.client_name}</td><td>${priorityConfig[t.priority].label}</td><td>${statusConfig[t.status].label}</td><td>${format(new Date(t.due_date), 'yyyy/MM/dd')}</td><td>${t.started_by_name || '-'}</td></tr>`).join('')}</tbody></table></body></html>`);
    printWindow.document.close(); printWindow.print();
  };

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));

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
                
                {/* اختيار العميل مع البحث والإضافة السريعة */}
                <div>
                  <Label>العميل *</Label>
                  <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {formData.client_name || "اختر أو أضف عميل..."}
                        <Search className="w-4 h-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      {!isAddingNewClient ? (
                        <Command>
                          <CommandInput placeholder="ابحث عن عميل..." value={clientSearch} onValueChange={setClientSearch} />
                          <CommandList>
                            <CommandEmpty>
                              <div className="p-4 text-center">
                                <p className="text-sm text-muted-foreground mb-2">لم يتم العثور على عميل</p>
                                <Button size="sm" onClick={() => { setIsAddingNewClient(true); setNewClientName(clientSearch); }}>
                                  <UserPlus className="w-4 h-4 ml-2" />
                                  إضافة "{clientSearch}" كعميل جديد
                                </Button>
                              </div>
                            </CommandEmpty>
                            <CommandGroup heading="العملاء">
                              {filteredClients.map((client) => (
                                <CommandItem key={client.id} onSelect={() => handleSelectClient(client)}>
                                  <User className="w-4 h-4 ml-2" />
                                  {client.name}
                                  {client.phone && <span className="text-xs text-muted-foreground mr-2">({client.phone})</span>}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            <CommandGroup>
                              <CommandItem onSelect={() => setIsAddingNewClient(true)}>
                                <UserPlus className="w-4 h-4 ml-2 text-primary" />
                                <span className="text-primary">إضافة عميل جديد</span>
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      ) : (
                        <div className="p-4 space-y-3">
                          <Label>اسم العميل الجديد</Label>
                          <Input 
                            value={newClientName} 
                            onChange={(e) => setNewClientName(e.target.value)} 
                            placeholder="أدخل اسم العميل"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleQuickAddClient} className="flex-1">
                              <Plus className="w-4 h-4 ml-1" />إضافة
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setIsAddingNewClient(false); setNewClientName(""); }} className="flex-1">
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

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
          <Card key={task.id} className={`transition-all border-2 ${statusConfig[task.status].cardBg || `dark:bg-slate-900/50 ${getTaskAgeColor(task.created_at)}`}`}>
            <Collapsible open={expandedTasks.has(task.id)} onOpenChange={() => setExpandedTasks(prev => { const s = new Set(prev); s.has(task.id) ? s.delete(task.id) : s.add(task.id); return s; })}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className={`font-semibold truncate ${task.status === 'completed' || task.status === 'cancelled' ? 'text-white' : 'text-foreground'}`}>{task.title}</h3>
                      <Badge className={priorityConfig[task.priority].color}>{priorityConfig[task.priority].label}</Badge>
                      <Badge className={statusConfig[task.status].color}>{statusConfig[task.status].label}</Badge>
                    </div>
                    <div className={`flex flex-wrap gap-4 text-sm ${task.status === 'completed' || task.status === 'cancelled' ? 'text-white' : 'text-foreground/80 dark:text-white/90'}`}>
                      <span className="flex items-center gap-1 font-medium"><User className={`w-4 h-4 ${task.status === 'completed' || task.status === 'cancelled' ? 'text-white' : 'text-primary'}`} />{task.client_name}</span>
                      {task.phone && (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 font-medium"><Phone className={`w-4 h-4 ${task.status === 'completed' || task.status === 'cancelled' ? 'text-white' : 'text-primary'}`} />{task.phone}</span>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              const cleanPhone = task.phone?.replace(/\D/g, '');
                              const finalPhone = cleanPhone?.startsWith('0') ? `966${cleanPhone.substring(1)}` : cleanPhone;
                              window.open(`https://wa.me/${finalPhone}`, '_blank');
                            }}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                      <span className="flex items-center gap-1 font-medium"><Calendar className={`w-4 h-4 ${task.status === 'completed' || task.status === 'cancelled' ? 'text-white' : 'text-primary'}`} />{format(new Date(task.due_date), 'yyyy/MM/dd')}</span>
                      {task.started_by_name && <span className={`flex items-center gap-1 font-bold ${task.status === 'completed' || task.status === 'cancelled' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}><AlertCircle className="w-4 h-4" />المنفذ: {task.started_by_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.status === 'pending' && <Button size="sm" variant="outline" onClick={() => handleStartTask(task)}><Play className="w-4 h-4 ml-1" />بدء</Button>}
                    {task.status === 'in_progress' && <><Button size="sm" variant="outline" onClick={() => handlePauseTask(task)}><Pause className="w-4 h-4 ml-1" />إيقاف</Button><Button size="sm" onClick={() => openCompleteDialog(task)}><CheckCircle2 className="w-4 h-4 ml-1" />إكمال</Button></>}
                    {task.status === 'paused' && <><Button size="sm" variant="outline" onClick={() => handleResumeTask(task)}><RotateCcw className="w-4 h-4 ml-1" />استئناف</Button><Button size="sm" onClick={() => openCompleteDialog(task)}><CheckCircle2 className="w-4 h-4 ml-1" />إكمال</Button></>}
                    {['pending', 'in_progress', 'paused'].includes(task.status) && <><Button size="sm" variant="ghost" onClick={() => openEditDialog(task)}><Edit className="w-4 h-4" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => openCancelDialog(task)}><XCircle className="w-4 h-4" /></Button></>}
                    <Button size="sm" variant="ghost" onClick={() => openNotesDialog(task)} className={task.status === 'completed' || task.status === 'cancelled' ? 'text-white hover:bg-white/20' : ''}><MessageSquare className="w-4 h-4" /></Button>
                    <CollapsibleTrigger asChild><Button size="sm" variant="ghost" className={task.status === 'completed' || task.status === 'cancelled' ? 'text-white hover:bg-white/20' : ''}>{expandedTasks.has(task.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</Button></CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {task.description && <div><p className="text-sm font-medium text-muted-foreground mb-1">الوصف:</p><p className="text-sm">{task.description}</p></div>}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div><span className="text-muted-foreground">تاريخ الإضافة: </span>{format(new Date(task.created_at), 'yyyy/MM/dd HH:mm', { locale: ar })}</div>
                      {task.total_work_time > 0 && <div><span className="text-muted-foreground">وقت العمل: </span>{formatWorkTime(task.total_work_time)}</div>}
                      {task.completed_at && <div><span className="text-muted-foreground">تاريخ الإكمال: </span>{format(new Date(task.completed_at), 'yyyy/MM/dd HH:mm', { locale: ar })}</div>}
                      {task.service_amount > 0 && <div><span className="text-muted-foreground">الأتعاب: </span>{formatCurrency(task.service_amount)}</div>}
                      {task.government_fees > 0 && <div><span className="text-muted-foreground">الرسوم الحكومية: </span>{formatCurrency(task.government_fees)}</div>}
                    </div>
                    <Button size="sm" variant="link" className="p-0" onClick={() => openLogsDialog(task)}><Clock className="w-4 h-4 ml-1" />عرض سجل العمليات</Button>
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* نافذة التعديل */}
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

      {/* نافذة إكمال المهمة مع المبالغ */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إكمال المهمة وتسجيل المبالغ</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{selectedTask?.title}</p>
              <p className="text-sm text-muted-foreground">العميل: {selectedTask?.client_name}</p>
            </div>
            <div>
              <Label>أتعاب الخدمة (ريال) *</Label>
              <Input 
                type="number" 
                value={completeFormData.service_amount} 
                onChange={(e) => setCompleteFormData(p => ({ ...p, service_amount: e.target.value }))} 
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>الرسوم الحكومية (ريال)</Label>
              <Input 
                type="number" 
                value={completeFormData.government_fees} 
                onChange={(e) => setCompleteFormData(p => ({ ...p, government_fees: e.target.value }))} 
                placeholder="0.00"
              />
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>أتعاب الخدمة:</span>
                  <span>{formatCurrency(parseFloat(completeFormData.service_amount) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>الرسوم الحكومية:</span>
                  <span>{formatCurrency(parseFloat(completeFormData.government_fees) || 0)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>الإجمالي:</span>
                  <span>{formatCurrency((parseFloat(completeFormData.service_amount) || 0) + (parseFloat(completeFormData.government_fees) || 0))}</span>
                </div>
              </CardContent>
            </Card>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-300">عند التأكيد سيتم:</p>
              <ul className="list-disc list-inside text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                <li>إغلاق المهمة كمكتملة</li>
                <li>إنشاء فاتورة مبيعات تلقائياً</li>
                {isAdmin && <li>ترحيل المبلغ كدين على العميل</li>}
              </ul>
            </div>
            <Button onClick={handleCompleteTaskWithFinancials} className="w-full">
              <CheckCircle2 className="w-4 h-4 ml-2" />
              تأكيد الإكمال وإنشاء الفاتورة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة الملاحظات */}
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

      {/* نافذة تأكيد الإلغاء */}
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

      {/* نافذة سجل العمليات */}
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

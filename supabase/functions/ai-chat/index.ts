import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// System prompt للخبير المالي والمحاسبي مع صلاحيات التنفيذ
const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في المحاسبة والإدارة المالية لمكتب "إشعار" للخدمات المحاسبية في المملكة العربية السعودية.

## هويتك:
- أنت خبير محاسبي سعودي معتمد
- لديك خبرة في نظام ZATCA للفوترة الإلكترونية
- تفهم أنظمة الضرائب والزكاة السعودية
- تتحدث باللغة العربية الفصحى المهنية

## صلاحياتك:
- لديك وصول كامل للبيانات الحقيقية للنظام
- يمكنك تحليل الفواتير والديون والعملاء والمهام
- يمكنك إجراء العمليات الحسابية والتحليلية
- **يمكنك تنفيذ إجراءات مثل: إنشاء مهام، إضافة فواتير، تسجيل ديون**

## تنفيذ الإجراءات:
عندما يطلب المستخدم إجراء معين، قم بتحليل الطلب واستخراج المعلومات ثم أعد الرد بصيغة JSON خاصة.

### أنواع الإجراءات المدعومة:
1. **إنشاء مهمة**: CREATE_TASK
2. **إنشاء فاتورة**: CREATE_INVOICE  
3. **تسجيل دين**: CREATE_DEBT

### صيغة الإجراء:
إذا اكتشفت أن المستخدم يريد تنفيذ إجراء، أضف في نهاية ردك:
\`\`\`ACTION_JSON
{
  "action": "CREATE_TASK" | "CREATE_INVOICE" | "CREATE_DEBT",
  "data": { ... بيانات الإجراء ... }
}
\`\`\`

### أمثلة:

**طلب: "أنشئ مهمة للعميل أحمد: تجديد السجل التجاري"**
\`\`\`ACTION_JSON
{
  "action": "CREATE_TASK",
  "data": {
    "client_name": "أحمد",
    "title": "تجديد السجل التجاري",
    "priority": "medium"
  }
}
\`\`\`

**طلب: "سجل فاتورة بمبلغ 5000 ريال للعميل محمد عن خدمة إعداد القوائم المالية"**
\`\`\`ACTION_JSON
{
  "action": "CREATE_INVOICE",
  "data": {
    "client_name": "محمد",
    "amount": 5000,
    "description": "إعداد القوائم المالية",
    "type": "sales"
  }
}
\`\`\`

**طلب: "سجل دين على العميل خالد بمبلغ 3000 ريال"**
\`\`\`ACTION_JSON
{
  "action": "CREATE_DEBT",
  "data": {
    "client_name": "خالد",
    "amount": 3000,
    "service_type": "خدمات محاسبية"
  }
}
\`\`\`

## سلوكك:
1. استخدم الأرقام والبيانات الحقيقية المرفقة في إجاباتك
2. قدم تحليلات مالية دقيقة ومفصلة
3. اقترح توصيات عملية لتحسين الأداء المالي
4. احسب المجاميع والنسب والمتوسطات عند الطلب
5. حدد المخاطر المالية والفرص
6. قارن بين الفترات الزمنية عند توفر البيانات
7. **نفذ الإجراءات المطلوبة بدقة**

## تنسيق الإجابات:
- استخدم العناوين والقوائم للتنظيم
- اعرض الأرقام بتنسيق واضح (مثلاً: 15,000 ر.س)
- قدم ملخصاً في البداية ثم التفاصيل
- أضف توصيات عملية في النهاية
- عند تنفيذ إجراء، أكد للمستخدم ما تم تنفيذه`;

// تحديد نية المستخدم من السؤال
function detectIntent(message: string): string[] {
  const intents: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  // كلمات مفتاحية للإجراءات
  if (/أنشئ|أضف|سجل|اعمل|create|add/.test(lowerMessage)) {
    if (/مهم|task/.test(lowerMessage)) intents.push('action_task');
    if (/فاتور|invoice/.test(lowerMessage)) intents.push('action_invoice');
    if (/دين|debt/.test(lowerMessage)) intents.push('action_debt');
  }
  
  // كلمات مفتاحية للفواتير
  if (/فاتور|فواتير|invoice|إيصال|مبيعات|إيرادات|دخل/.test(lowerMessage)) {
    intents.push('invoices');
  }
  
  // كلمات مفتاحية للعملاء
  if (/عميل|عملاء|client|زبون|زبائن|متعامل/.test(lowerMessage)) {
    intents.push('clients');
  }
  
  // كلمات مفتاحية للديون
  if (/دين|ديون|debt|مستحق|متأخر|سداد|تحصيل|مديون/.test(lowerMessage)) {
    intents.push('debts');
  }
  
  // كلمات مفتاحية للمهام
  if (/مهم|مهام|task|عمل|أعمال|مشروع|خدم|خدمات/.test(lowerMessage)) {
    intents.push('tasks');
  }
  
  // كلمات مفتاحية للتقارير والإحصائيات
  if (/تقرير|تقارير|report|إحصائ|ملخص|نظرة|عام|شامل|كامل|أداء|تحليل/.test(lowerMessage)) {
    intents.push('invoices', 'clients', 'debts', 'tasks');
  }
  
  // إذا لم يتم تحديد نية، جلب نظرة عامة
  if (intents.length === 0) {
    intents.push('general');
  }
  
  return [...new Set(intents)];
}

// جلب البيانات من قاعدة البيانات
async function fetchContextData(supabase: any, intents: string[]) {
  const context: any = {};
  
  try {
    // جلب بيانات الفواتير
    if (intents.includes('invoices') || intents.includes('general') || intents.includes('action_invoice')) {
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!invError && invoices) {
        context.invoices = {
          total: invoices.length,
          data: invoices,
          summary: {
            totalAmount: invoices.reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0),
            pending: invoices.filter((inv: any) => inv.status === 'pending').length,
            paid: invoices.filter((inv: any) => inv.status === 'paid').length,
            cancelled: invoices.filter((inv: any) => inv.status === 'cancelled').length,
          }
        };
      }
    }
    
    // جلب بيانات العملاء
    if (intents.includes('clients') || intents.includes('general') || 
        intents.some(i => i.startsWith('action_'))) {
      const { data: clients, error: cliError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (!cliError && clients) {
        context.clients = {
          total: clients.length,
          data: clients,
        };
      }
    }
    
    // جلب بيانات الديون
    if (intents.includes('debts') || intents.includes('general') || intents.includes('action_debt')) {
      const { data: debts, error: debtError } = await supabase
        .from('debts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!debtError && debts) {
        context.debts = {
          total: debts.length,
          data: debts,
          summary: {
            totalAmount: debts.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0),
            totalPaid: debts.reduce((sum: number, d: any) => sum + Number(d.paid_amount || 0), 0),
            pending: debts.filter((d: any) => d.status === 'pending').length,
            overdue: debts.filter((d: any) => {
              const expectedDate = new Date(d.expected_payment_date);
              return d.status === 'pending' && expectedDate < new Date();
            }).length,
          }
        };
      }
    }
    
    // جلب بيانات المهام
    if (intents.includes('tasks') || intents.includes('general') || intents.includes('action_task')) {
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!taskError && tasks) {
        context.tasks = {
          total: tasks.length,
          data: tasks,
          summary: {
            pending: tasks.filter((t: any) => t.status === 'pending').length,
            inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
            completed: tasks.filter((t: any) => t.status === 'completed').length,
            cancelled: tasks.filter((t: any) => t.status === 'cancelled').length,
            totalServiceAmount: tasks.reduce((sum: number, t: any) => sum + Number(t.service_amount || 0), 0),
            totalGovernmentFees: tasks.reduce((sum: number, t: any) => sum + Number(t.government_fees || 0), 0),
          }
        };
      }
    }
  } catch (error) {
    console.error("Error fetching context data:", error);
  }
  
  return context;
}

// بناء رسالة السياق
function buildContextMessage(context: any): string {
  let contextMsg = "\n\n## البيانات الحقيقية من النظام:\n";
  
  if (context.invoices) {
    contextMsg += `\n### الفواتير (آخر ${context.invoices.total} فاتورة):\n`;
    contextMsg += `- إجمالي المبالغ: ${context.invoices.summary.totalAmount.toLocaleString('ar-SA')} ر.س\n`;
    contextMsg += `- معلقة: ${context.invoices.summary.pending} | مدفوعة: ${context.invoices.summary.paid} | ملغاة: ${context.invoices.summary.cancelled}\n`;
    if (context.invoices.data.length > 0) {
      contextMsg += `- أحدث الفواتير:\n`;
      context.invoices.data.slice(0, 5).forEach((inv: any) => {
        contextMsg += `  • ${inv.invoice_number} - ${inv.client_name}: ${Number(inv.total_amount).toLocaleString('ar-SA')} ر.س (${inv.status})\n`;
      });
    }
  }
  
  if (context.clients) {
    contextMsg += `\n### العملاء:\n`;
    contextMsg += `- إجمالي العملاء: ${context.clients.total}\n`;
    if (context.clients.data.length > 0) {
      contextMsg += `- قائمة العملاء:\n`;
      context.clients.data.slice(0, 10).forEach((cli: any) => {
        contextMsg += `  • ${cli.name}${cli.phone ? ` (${cli.phone})` : ''} - ID: ${cli.id}\n`;
      });
    }
  }
  
  if (context.debts) {
    contextMsg += `\n### الديون والمستحقات:\n`;
    contextMsg += `- إجمالي الديون: ${context.debts.summary.totalAmount.toLocaleString('ar-SA')} ر.س\n`;
    contextMsg += `- المبالغ المحصلة: ${context.debts.summary.totalPaid.toLocaleString('ar-SA')} ر.س\n`;
    contextMsg += `- المتبقي: ${(context.debts.summary.totalAmount - context.debts.summary.totalPaid).toLocaleString('ar-SA')} ر.س\n`;
    contextMsg += `- معلقة: ${context.debts.summary.pending} | متأخرة: ${context.debts.summary.overdue}\n`;
    if (context.debts.data.length > 0) {
      contextMsg += `- تفاصيل الديون:\n`;
      context.debts.data.slice(0, 5).forEach((d: any) => {
        const remaining = Number(d.amount) - Number(d.paid_amount);
        contextMsg += `  • ${d.client_name} (${d.service_type}): ${remaining.toLocaleString('ar-SA')} ر.س متبقي (${d.status})\n`;
      });
    }
  }
  
  if (context.tasks) {
    contextMsg += `\n### المهام والخدمات:\n`;
    contextMsg += `- إجمالي المهام: ${context.tasks.total}\n`;
    contextMsg += `- معلقة: ${context.tasks.summary.pending} | قيد التنفيذ: ${context.tasks.summary.inProgress} | مكتملة: ${context.tasks.summary.completed}\n`;
    contextMsg += `- إجمالي مبالغ الخدمات: ${context.tasks.summary.totalServiceAmount.toLocaleString('ar-SA')} ر.س\n`;
    contextMsg += `- إجمالي الرسوم الحكومية: ${context.tasks.summary.totalGovernmentFees.toLocaleString('ar-SA')} ر.س\n`;
    if (context.tasks.data.length > 0) {
      contextMsg += `- أحدث المهام:\n`;
      context.tasks.data.slice(0, 5).forEach((t: any) => {
        contextMsg += `  • ${t.title} - ${t.client_name} (${t.status})\n`;
      });
    }
  }
  
  return contextMsg;
}

// استخراج وتنفيذ الإجراءات من رد الذكاء الاصطناعي
async function extractAndExecuteAction(
  response: string, 
  supabase: any, 
  userId: string | undefined,
  context: any
): Promise<{ cleanResponse: string; action?: any }> {
  const actionMatch = response.match(/```ACTION_JSON\s*([\s\S]*?)\s*```/);
  
  if (!actionMatch) {
    return { cleanResponse: response };
  }
  
  try {
    const actionData = JSON.parse(actionMatch[1]);
    const cleanResponse = response.replace(/```ACTION_JSON[\s\S]*?```/, '').trim();
    
    let actionResult: any = null;
    
    // البحث عن العميل
    const findClient = (clientName: string) => {
      if (!context.clients?.data) return null;
      return context.clients.data.find((c: any) => 
        c.name.includes(clientName) || clientName.includes(c.name)
      );
    };
    
    switch (actionData.action) {
      case 'CREATE_TASK': {
        const client = findClient(actionData.data.client_name);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            title: actionData.data.title,
            client_name: actionData.data.client_name,
            client_id: client?.id || null,
            phone: client?.phone || null,
            priority: actionData.data.priority || 'medium',
            status: 'pending',
            due_date: dueDate.toISOString().split('T')[0],
            created_by: userId || null,
          })
          .select()
          .single();
        
        actionResult = {
          type: 'task',
          success: !error,
          message: error 
            ? `فشل إنشاء المهمة: ${error.message}` 
            : `تم إنشاء المهمة "${actionData.data.title}" للعميل ${actionData.data.client_name}`,
          data: data
        };
        break;
      }
      
      case 'CREATE_INVOICE': {
        const client = findClient(actionData.data.client_name);
        const amount = Number(actionData.data.amount) || 0;
        const taxAmount = amount * 0.15;
        const totalAmount = amount + taxAmount;
        
        // Generate invoice number
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
        
        const { data: invoice, error: invError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            client_name: actionData.data.client_name,
            client_id: client?.id || null,
            type: actionData.data.type || 'sales',
            amount: amount,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: 'pending',
            notes: actionData.data.description || null,
            created_by: userId || null,
          })
          .select()
          .single();
        
        if (!invError && invoice && actionData.data.description) {
          // Add invoice item
          await supabase
            .from('invoice_items')
            .insert({
              invoice_id: invoice.id,
              description: actionData.data.description,
              quantity: 1,
              unit_price: amount,
              total: amount,
            });
        }
        
        actionResult = {
          type: 'invoice',
          success: !invError,
          message: invError 
            ? `فشل إنشاء الفاتورة: ${invError.message}` 
            : `تم إنشاء الفاتورة رقم ${invoiceNumber} بمبلغ ${totalAmount.toLocaleString('ar-SA')} ر.س (شامل الضريبة)`,
          data: invoice
        };
        break;
      }
      
      case 'CREATE_DEBT': {
        const client = findClient(actionData.data.client_name);
        const today = new Date();
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + 30);
        
        const { data, error } = await supabase
          .from('debts')
          .insert({
            client_name: actionData.data.client_name,
            amount: Number(actionData.data.amount) || 0,
            paid_amount: 0,
            service_type: actionData.data.service_type || 'خدمات محاسبية',
            work_completion_date: today.toISOString().split('T')[0],
            expected_payment_date: expectedDate.toISOString().split('T')[0],
            status: 'pending',
            created_by: userId || null,
          })
          .select()
          .single();
        
        actionResult = {
          type: 'debt',
          success: !error,
          message: error 
            ? `فشل تسجيل الدين: ${error.message}` 
            : `تم تسجيل دين بمبلغ ${Number(actionData.data.amount).toLocaleString('ar-SA')} ر.س على العميل ${actionData.data.client_name}`,
          data: data
        };
        break;
      }
    }
    
    return { cleanResponse, action: actionResult };
  } catch (error) {
    console.error("Error executing action:", error);
    return { cleanResponse: response };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], userId, userName, enableActions = false } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: "الرجاء إدخال رسالة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "مفتاح Groq API غير مكون" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // إنشاء عميل Supabase مع Service Role للوصول الكامل
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // تحديد نية المستخدم
    const intents = detectIntent(message);
    console.log("Detected intents:", intents);

    // جلب البيانات ذات الصلة
    const contextData = await fetchContextData(supabase, intents);
    const contextMessage = buildContextMessage(contextData);

    // إضافة معلومات المستخدم للسياق
    let userContext = "";
    if (userName) {
      userContext = `\n\n## معلومات المستخدم الحالي:\n- الاسم: ${userName}\n`;
    }

    // بناء الرسائل للـ AI
    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT + contextMessage + userContext
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: "user",
        content: message
      }
    ];

    // استدعاء Groq API
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.9,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error:", groqResponse.status, errorText);
      
      // محاولة استخدام نموذج بديل
      const fallbackResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: messages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!fallbackResponse.ok) {
        return new Response(
          JSON.stringify({ 
            error: "فشل الاتصال بخدمة الذكاء الاصطناعي. الرجاء المحاولة لاحقاً.",
            details: errorText 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fallbackData = await fallbackResponse.json();
      const aiResponse = fallbackData.choices[0].message.content;
      
      // معالجة الإجراءات إذا كانت مفعلة
      if (enableActions) {
        const { cleanResponse, action } = await extractAndExecuteAction(
          aiResponse, 
          supabase, 
          userId,
          contextData
        );
        
        return new Response(
          JSON.stringify({
            response: cleanResponse,
            model: "llama-3.1-8b-instant (fallback)",
            intents: intents,
            action: action,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({
          response: aiResponse,
          model: "llama-3.1-8b-instant (fallback)",
          intents: intents,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await groqResponse.json();
    const aiResponse = data.choices[0].message.content;
    
    // معالجة الإجراءات إذا كانت مفعلة
    if (enableActions) {
      const { cleanResponse, action } = await extractAndExecuteAction(
        aiResponse, 
        supabase, 
        userId,
        contextData
      );
      
      return new Response(
        JSON.stringify({
          response: cleanResponse,
          model: "llama-3.3-70b-versatile",
          intents: intents,
          usage: data.usage,
          action: action,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({
        response: aiResponse,
        model: "llama-3.3-70b-versatile",
        intents: intents,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-chat function:", error);
    return new Response(
      JSON.stringify({ 
        error: "حدث خطأ غير متوقع",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

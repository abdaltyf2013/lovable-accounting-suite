import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles,
  Minimize2,
  Maximize2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  ListTodo
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  action?: ActionResult;
}

interface ActionResult {
  type: 'invoice' | 'task' | 'debt' | 'client';
  success: boolean;
  message: string;
  data?: any;
}

const suggestedQuestions = [
  "ما هي إجمالي الفواتير هذا الشهر؟",
  "من هو العميل الأكثر مديونية؟",
  "أعطني تقرير شامل عن أداء المكتب",
  "ما هي المهام المتأخرة؟",
  "حلل لي إيرادات الشهر الماضي",
];

const actionExamples = [
  "أنشئ مهمة جديدة للعميل أحمد: تجديد السجل التجاري",
  "أضف فاتورة بمبلغ 5000 ريال للعميل محمد",
  "سجل دين جديد على العميل خالد بمبلغ 3000 ريال",
];

// Simple markdown renderer without external dependencies
function SimpleMarkdown({ content }: { content: string }) {
  const renderContent = (text: string) => {
    // Split by code blocks first
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3).replace(/^\w+\n/, '');
        return (
          <pre key={index} className="bg-muted/50 rounded-lg p-3 my-2 overflow-x-auto text-xs">
            <code>{code}</code>
          </pre>
        );
      }
      
      // Process inline markdown
      return part.split('\n').map((line, lineIndex) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={`${index}-${lineIndex}`} className="font-bold text-base mt-3 mb-1">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={`${index}-${lineIndex}`} className="font-bold text-lg mt-4 mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={`${index}-${lineIndex}`} className="font-bold text-xl mt-4 mb-2">{line.slice(2)}</h1>;
        }
        
        // List items
        if (line.match(/^[-•*]\s/)) {
          return (
            <li key={`${index}-${lineIndex}`} className="mr-4 my-0.5">
              {processInlineMarkdown(line.slice(2))}
            </li>
          );
        }
        
        // Numbered list
        if (line.match(/^\d+\.\s/)) {
          return (
            <li key={`${index}-${lineIndex}`} className="mr-4 my-0.5 list-decimal">
              {processInlineMarkdown(line.replace(/^\d+\.\s/, ''))}
            </li>
          );
        }
        
        // Empty line
        if (!line.trim()) {
          return <br key={`${index}-${lineIndex}`} />;
        }
        
        // Regular paragraph
        return (
          <p key={`${index}-${lineIndex}`} className="my-1">
            {processInlineMarkdown(line)}
          </p>
        );
      });
    });
  };
  
  const processInlineMarkdown = (text: string) => {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code
    text = text.replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>');
    
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };
  
  return <div className="text-sm leading-relaxed">{renderContent(content)}</div>;
}

function ActionBadge({ action }: { action: ActionResult }) {
  const icons = {
    invoice: FileText,
    task: ListTodo,
    debt: AlertCircle,
    client: User,
  };
  
  const labels = {
    invoice: 'فاتورة',
    task: 'مهمة',
    debt: 'دين',
    client: 'عميل',
  };
  
  const Icon = icons[action.type];
  
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg mt-2 text-xs",
      action.success 
        ? "bg-green-500/10 text-green-600 dark:text-green-400" 
        : "bg-red-500/10 text-red-600 dark:text-red-400"
    )}>
      {action.success ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <Icon className="h-3 w-3" />
      <span>{labels[action.type]}: {action.message}</span>
    </div>
  );
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: text,
          conversationHistory,
          userId: user?.id,
          userName: profile?.full_name || user?.email,
          enableActions: true,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        model: data.model,
        action: data.action,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي. الرجاء المحاولة مرة أخرى.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* زر فتح المحادثة */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl flex items-center justify-center hover:shadow-2xl transition-shadow"
          >
            <Sparkles className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* نافذة المحادثة */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed z-50 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden",
              isExpanded 
                ? "inset-4 md:inset-8" 
                : "bottom-6 left-6 w-[380px] h-[600px] max-h-[80vh]"
            )}
          >
            {/* الهيدر */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-l from-primary/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">مساعد إشعار الذكي</h3>
                  <p className="text-xs text-muted-foreground">تحليل وتنفيذ إجراءات</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearChat}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="مسح المحادثة"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* منطقة الرسائل */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">مرحباً! كيف يمكنني مساعدتك؟</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    يمكنني تحليل البيانات وتنفيذ الإجراءات
                  </p>
                  
                  {/* التبديل بين الأسئلة والإجراءات */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setShowActions(false)}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full transition-colors",
                        !showActions 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      أسئلة وتحليلات
                    </button>
                    <button
                      onClick={() => setShowActions(true)}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full transition-colors",
                        showActions 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      إجراءات سريعة
                    </button>
                  </div>
                  
                  <div className="space-y-2 w-full">
                    <p className="text-xs text-muted-foreground mb-2">
                      {showActions ? 'أمثلة على الإجراءات:' : 'جرب هذه الأسئلة:'}
                    </p>
                    {(showActions ? actionExamples : suggestedQuestions).map((question, index) => (
                      <button
                        key={index}
                        onClick={() => sendMessage(question)}
                        className="w-full text-right px-3 py-2 text-sm rounded-lg bg-muted/50 hover:bg-muted text-foreground transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-3",
                        message.role === 'user' ? "flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        message.role === 'user' 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-primary/20 text-primary"
                      )}>
                        {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={cn(
                        "flex-1 rounded-2xl px-4 py-3 max-w-[85%]",
                        message.role === 'user' 
                          ? "bg-primary text-primary-foreground rounded-tr-sm" 
                          : "bg-muted rounded-tl-sm"
                      )}>
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                            <SimpleMarkdown content={message.content} />
                            {message.action && <ActionBadge action={message.action} />}
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                        {message.model && (
                          <p className="text-[10px] mt-2 opacity-60">
                            {message.model}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">جاري المعالجة...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* منطقة الإدخال */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب سؤالك أو الإجراء المطلوب..."
                  className="min-h-[44px] max-h-[120px] resize-none rounded-xl"
                  rows={1}
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="h-11 w-11 rounded-xl shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                يمكنني إنشاء مهام، فواتير، وتسجيل الديون
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

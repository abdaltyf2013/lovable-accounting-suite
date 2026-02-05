 import { useState, useEffect } from 'react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Download, Smartphone, Check, Share, Plus, MoreVertical } from 'lucide-react';
 import { useNavigate } from 'react-router-dom';
 
 interface BeforeInstallPromptEvent extends Event {
   prompt(): Promise<void>;
   userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
 }
 
 export default function Install() {
   const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
   const [isInstalled, setIsInstalled] = useState(false);
   const [isIOS, setIsIOS] = useState(false);
   const navigate = useNavigate();
 
   useEffect(() => {
     // Check if already installed
     if (window.matchMedia('(display-mode: standalone)').matches) {
       setIsInstalled(true);
     }
 
     // Check if iOS
     const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
     setIsIOS(isIOSDevice);
 
     // Listen for install prompt
     const handleBeforeInstall = (e: Event) => {
       e.preventDefault();
       setDeferredPrompt(e as BeforeInstallPromptEvent);
     };
 
     window.addEventListener('beforeinstallprompt', handleBeforeInstall);
 
     return () => {
       window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
     };
   }, []);
 
   const handleInstall = async () => {
     if (!deferredPrompt) return;
 
     deferredPrompt.prompt();
     const { outcome } = await deferredPrompt.userChoice;
     
     if (outcome === 'accepted') {
       setIsInstalled(true);
     }
     setDeferredPrompt(null);
   };
 
   if (isInstalled) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background p-4">
         <Card className="w-full max-w-md text-center">
           <CardHeader>
             <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <Check className="w-8 h-8 text-success" />
             </div>
             <CardTitle>التطبيق مُثبت!</CardTitle>
             <CardDescription>
               يمكنك الآن الوصول للتطبيق من الشاشة الرئيسية
             </CardDescription>
           </CardHeader>
           <CardContent>
             <Button onClick={() => navigate('/dashboard')} className="w-full">
               الانتقال للوحة التحكم
             </Button>
           </CardContent>
         </Card>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen flex items-center justify-center bg-background p-4">
       <Card className="w-full max-w-md">
         <CardHeader className="text-center">
           <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
             <Smartphone className="w-10 h-10 text-primary" />
           </div>
           <CardTitle className="text-2xl">تثبيت نظام إشعار</CardTitle>
           <CardDescription>
             قم بتثبيت التطبيق على هاتفك للوصول السريع والاستخدام بدون إنترنت
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           {isIOS ? (
             <div className="space-y-4">
               <p className="text-sm text-muted-foreground text-center">
                 لتثبيت التطبيق على جهاز iPhone أو iPad:
               </p>
               <div className="space-y-3">
                 <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                   <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                   <div className="flex-1">
                     <p className="text-sm">اضغط على زر المشاركة</p>
                     <Share className="w-5 h-5 text-muted-foreground mt-1" />
                   </div>
                 </div>
                 <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                   <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                   <div className="flex-1">
                     <p className="text-sm">اختر "إضافة إلى الشاشة الرئيسية"</p>
                     <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                       <Plus className="w-4 h-4" />
                       <span className="text-xs">Add to Home Screen</span>
                     </div>
                   </div>
                 </div>
                 <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                   <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                   <p className="text-sm">اضغط "إضافة" للتأكيد</p>
                 </div>
               </div>
             </div>
           ) : deferredPrompt ? (
             <Button onClick={handleInstall} className="w-full" size="lg">
               <Download className="w-5 h-5 ml-2" />
               تثبيت التطبيق
             </Button>
           ) : (
             <div className="space-y-4">
               <p className="text-sm text-muted-foreground text-center">
                 لتثبيت التطبيق على جهاز Android:
               </p>
               <div className="space-y-3">
                 <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                   <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                   <div className="flex-1">
                     <p className="text-sm">اضغط على قائمة المتصفح</p>
                     <MoreVertical className="w-5 h-5 text-muted-foreground mt-1" />
                   </div>
                 </div>
                 <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                   <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                   <p className="text-sm">اختر "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية"</p>
                 </div>
               </div>
             </div>
           )}
 
           <div className="pt-4 border-t">
             <h4 className="font-medium mb-3">مميزات التثبيت:</h4>
             <ul className="space-y-2 text-sm text-muted-foreground">
               <li className="flex items-center gap-2">
                 <Check className="w-4 h-4 text-success" />
                 وصول سريع من الشاشة الرئيسية
               </li>
               <li className="flex items-center gap-2">
                 <Check className="w-4 h-4 text-success" />
                 يعمل بدون اتصال بالإنترنت
               </li>
               <li className="flex items-center gap-2">
                 <Check className="w-4 h-4 text-success" />
                 تحميل أسرع وأداء أفضل
               </li>
               <li className="flex items-center gap-2">
                 <Check className="w-4 h-4 text-success" />
                 تجربة تطبيق كاملة
               </li>
             </ul>
           </div>
 
           <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
             متابعة بدون تثبيت
           </Button>
         </CardContent>
       </Card>
     </div>
   );
 }
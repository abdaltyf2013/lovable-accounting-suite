import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, User } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: 'خطأ في تسجيل الدخول',
        description: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'مرحباً بك',
        description: 'تم تسجيل الدخول بنجاح',
      });
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      toast({
        title: 'خطأ في إنشاء الحساب',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'تم إنشاء الحساب',
        description: 'تم إنشاء حسابك بنجاح',
      });
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* الشعار والعنوان */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            {/* شعار للوضع الفاتح */}
            <img 
              src="./logo-light.png" 
              alt="إشعار - نظام محاسبي ذكي" 
              className="h-32 w-auto object-contain dark:hidden"
            />
            {/* شعار للوضع الداكن */}
            <img 
              src="./logo-dark.png" 
              alt="إشعار - نظام محاسبي ذكي" 
              className="h-32 w-auto object-contain hidden dark:block"
            />
          </div>
        </div>

        {/* بطاقة تسجيل الدخول */}
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700">
              <TabsTrigger 
                value="signin"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white text-gray-700 dark:text-gray-300 font-semibold"
              >
                تسجيل الدخول
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white text-gray-700 dark:text-gray-300 font-semibold"
              >
                حساب جديد
              </TabsTrigger>
            </TabsList>
            
            {/* تبويب تسجيل الدخول */}
            <TabsContent value="signin">
              <CardHeader>
                <CardTitle className="text-2xl text-gray-900 dark:text-white">تسجيل الدخول</CardTitle>
                <CardDescription className="text-base text-gray-600 dark:text-gray-400">أدخل بياناتك للوصول إلى حسابك</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-base text-gray-900 dark:text-gray-100 font-medium">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="example@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pr-11 h-12 text-base border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-base text-gray-900 dark:text-gray-100 font-medium">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-11 h-12 text-base border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 transition-all duration-200 shadow-lg text-white" 
                    disabled={loading}
                  >
                    {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
            
            {/* تبويب إنشاء حساب */}
            <TabsContent value="signup">
              <CardHeader>
                <CardTitle className="text-2xl text-gray-900 dark:text-white">إنشاء حساب جديد</CardTitle>
                <CardDescription className="text-base text-gray-600 dark:text-gray-400">أنشئ حساباً للوصول إلى النظام</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-base text-gray-900 dark:text-gray-100 font-medium">الاسم الكامل</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="أحمد محمد"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pr-11 h-12 text-base border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-base text-gray-900 dark:text-gray-100 font-medium">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="example@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pr-11 h-12 text-base border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-base text-gray-900 dark:text-gray-100 font-medium">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-11 h-12 text-base border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 transition-all duration-200 shadow-lg text-white" 
                    disabled={loading}
                  >
                    {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* تذييل */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            جميع الحقوق محفوظة © 2026 إشعار
          </p>
        </div>
      </div>
    </div>
  );
}

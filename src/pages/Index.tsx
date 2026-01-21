import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FileText, CheckSquare, TrendingUp, Users, Mail, Phone, MapPin } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      title: "إدارة الفواتير",
      description: "نظام متكامل لإدارة فواتير المبيعات والمشتريات بكل سهولة ودقة"
    },
    {
      icon: CheckSquare,
      title: "تتبع المهام",
      description: "متابعة المهام والمشاريع بكفاءة مع تحديد الأولويات والمواعيد"
    },
    {
      icon: TrendingUp,
      title: "تقارير تفصيلية",
      description: "تقارير شاملة ورسوم بيانية لمتابعة الأداء المالي والإداري"
    },
    {
      icon: Users,
      title: "إدارة العملاء",
      description: "قاعدة بيانات متكاملة لإدارة معلومات العملاء والموردين"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              مؤسسة إشعار للنسخ والتصوير
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light">
              نظام إدارة الحسابات
            </p>
          </div>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            نظام متكامل لإدارة الفواتير والمهام والتقارير المالية بكفاءة وسهولة
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/login')}
              className="text-lg px-8 py-6 w-full sm:w-auto"
            >
              تسجيل الدخول
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/register')}
              className="text-lg px-8 py-6 w-full sm:w-auto"
            >
              حساب جديد
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 md:py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              الميزات الرئيسية
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              كل ما تحتاجه لإدارة أعمالك بكفاءة في مكان واحد
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-none shadow-none bg-background/50 hover:bg-background transition-colors">
                <CardContent className="p-8 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Company Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">مؤسسة إشعار للنسخ والتصوير</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                نظام متكامل لإدارة الحسابات والفواتير والمهام
              </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">تواصل معنا</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>+966 XX XXX XXXX</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>info@eshaarcopy.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>المملكة العربية السعودية</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">روابط سريعة</h3>
              <div className="space-y-2 text-sm">
                <button 
                  onClick={() => navigate('/login')}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  تسجيل الدخول
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  حساب جديد
                </button>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} مؤسسة إشعار للنسخ والتصوير. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

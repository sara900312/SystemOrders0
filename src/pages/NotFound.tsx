import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleGoHome = () => {
    navigate("/");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardContent className="p-8 text-center space-y-6">
          {/* 404 Title */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-primary">404</h1>
            <h2 className="text-2xl font-semibold text-gray-800">الصفحة غير موجودة</h2>
            <h3 className="text-lg text-gray-600">Page Not Found</h3>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-gray-700">
              عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
            </p>
            <p className="text-sm text-gray-600">
              Sorry, the page you are looking for could not be found or has been moved.
            </p>
          </div>

          {/* Current Path */}
          {location.pathname && location.pathname !== "/" && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-xs text-gray-600 break-all">
                المسار المطلوب: <code className="font-mono">{location.pathname}</code>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleGoHome}
              className="w-full gap-2"
              size="lg"
            >
              <Home className="w-4 h-4" />
              العودة للصفحة الرئيسية
            </Button>

            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full gap-2"
              size="lg"
            >
              <ArrowLeft className="w-4 h-4" />
              العودة للصفحة السابقة
            </Button>
          </div>

          {/* Additional Help */}
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              إذا كنت تعتقد أن هذا خطأ، يرجى المحاولة مرة أخرى أو الاتصال بالدعم.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;

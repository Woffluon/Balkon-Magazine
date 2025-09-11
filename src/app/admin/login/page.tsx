import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f9f9f9] px-4 pt-20">
      <Card className="mx-auto w-full max-w-sm border-gray-200 bg-white">
        <CardHeader className="text-center">
          <CardTitle className="text-xl sm:text-2xl text-gray-900 font-semibold">Admin Girişi</CardTitle>
          <CardDescription className="text-sm sm:text-base text-gray-600">
            Balkon Dergisi yönetici paneline hoş geldiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-posta</Label>
              <Input 
                id="email" 
                type="email" 
                name="email" 
                required 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Şifre</Label>
              <Input 
                id="password" 
                type="password" 
                name="password" 
                required 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Giriş Yap
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


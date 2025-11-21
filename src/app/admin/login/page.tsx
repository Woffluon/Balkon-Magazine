"use client";
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
import { login, type LoginState } from "./actions";
import { useActionState, startTransition } from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginDto } from "@/lib/validators/magazineSchemas";

export default function LoginPage() {
  const initialState: LoginState = { error: undefined };
  const loginAction = login as (
    prevState: LoginState,
    formData: FormData
  ) => Promise<LoginState>;
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  const {
    register,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

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
          {state?.error ? (
            <div
              role="alert"
              aria-live="polite"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {state.error}
            </div>
          ) : null}
          <form 
            onSubmit={handleSubmit((data) => {
              const formData = new FormData();
              formData.append('email', data.email);
              formData.append('password', data.password);
              startTransition(() => {
                formAction(formData);
              });
            })} 
            className="grid gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-posta</Label>
              <Input 
                id="email" 
                type="email" 
                {...register("email")}
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  errors.email ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.email && (
                <p 
                  id="email-error" 
                  role="alert" 
                  className="text-sm text-red-800"
                >
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Şifre</Label>
              <Input 
                id="password" 
                type="password" 
                {...register("password")}
                aria-invalid={errors.password ? "true" : "false"}
                aria-describedby={errors.password ? "password-error" : undefined}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  errors.password ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.password && (
                <p 
                  id="password-error" 
                  role="alert" 
                  className="text-sm text-red-800"
                >
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={isPending || isSubmitting}
              aria-busy={isPending || isSubmitting}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {isPending || isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


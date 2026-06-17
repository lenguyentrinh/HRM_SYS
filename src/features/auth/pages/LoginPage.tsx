import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Phone, Lock, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginWithPhone } from '@/lib/auth'
import { useAuthStore } from '@/stores/authStore'

const loginSchema = z.object({
  phone: z.string().min(10, 'Invalid phone number').max(11),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginForm) => {
    try {
      const user = await loginWithPhone(values.phone, values.password)
      setUser(user)
      const to = user.role === 'employee' ? '/' : '/admin'
      navigate(to, { replace: true })
    } catch {
      toast.error('Invalid phone number or password')
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-orange-50 to-slate-100 flex items-center justify-center p-4 overflow-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-40">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-orange-100 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 mb-4 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <span className="text-3xl font-bold text-primary-foreground">H</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">HRM System</h1>
          <p className="text-slate-500 text-base mt-1">Human Resource Management</p>
        </div>

        <div className="bg-card rounded-xl border border-[#e0c0b1] p-8 md:p-10 shadow-[0_4px_12px_rgba(15,23,42,0.05),0_1px_3px_rgba(15,23,42,0.1)]">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Sign in</h2>
            <p className="text-sm text-slate-500">Enter your phone number and password</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-semibold tracking-wider text-slate-900">Phone Number</label>
              <div className="relative group">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary pointer-events-none transition-colors" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0901234567"
                  className="pl-10 py-3 bg-slate-50 border-[#e0c0b1] rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('phone')}
                />
              </div>
              {errors.phone && <p className="text-xs text-destructive flex items-center gap-1 mt-1">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold tracking-wider text-slate-900">Password</label>
                <a href="#" className="text-xs font-semibold text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary pointer-events-none transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-12 py-3 bg-slate-50 border-[#e0c0b1] rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive flex items-center gap-1 mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-[#e0c0b1] text-primary focus:ring-primary/20 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-slate-500 font-normal cursor-pointer select-none">
                Remember me
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold tracking-wider py-3.5 rounded-lg shadow-md active:scale-[0.98] transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <LogIn className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#e0c0b1] text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <a href="/signup" className="font-semibold text-primary hover:underline">Sign up</a>
              {' or '}
              <a href="#" className="font-semibold text-primary hover:underline">Contact Admin</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

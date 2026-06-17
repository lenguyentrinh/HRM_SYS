import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Phone, Lock, User, UserPlus, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { signUp } from '@/lib/auth'
import { useAuthStore } from '@/stores/authStore'
import { useBranches } from '@/features/branches/hooks/useBranches'

const signUpSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().min(10, 'Invalid phone number').max(11),
    branchId: z.string().min(1, 'Please select a branch'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignUpForm = z.infer<typeof signUpSchema>

export function SignUpPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { data: branches, isLoading: branchesLoading } = useBranches()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({ resolver: zodResolver(signUpSchema) })

  const selectedBranch = watch('branchId')

  const onSubmit = async (values: SignUpForm) => {
    try {
      const user = await signUp({
        fullName: values.fullName,
        phone: values.phone,
        password: values.password,
        branchId: values.branchId,
      })
      setUser(user)
      toast.success('Account created successfully')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account')
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
          <p className="text-slate-500 text-base mt-1">Create your account</p>
        </div>

        <div className="bg-card rounded-xl border border-[#e0c0b1] p-8 md:p-10 shadow-[0_4px_12px_rgba(15,23,42,0.05),0_1px_3px_rgba(15,23,42,0.1)]">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Sign up</h2>
            <p className="text-sm text-slate-500">Fill in your details to get started</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-sm font-semibold tracking-wider text-slate-900">Full Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary pointer-events-none transition-colors" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Nguyen Van A"
                  className="pl-10 py-3 bg-slate-50 border-[#e0c0b1] rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('fullName')}
                />
              </div>
              {errors.fullName && <p className="text-xs text-destructive flex items-center gap-1 mt-1">{errors.fullName.message}</p>}
            </div>

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
              <label className="block text-sm font-semibold tracking-wider text-slate-900">Branch</label>
              <div className="relative group">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary pointer-events-none transition-colors z-10" />
                <Select
                  value={selectedBranch}
                  onValueChange={(val) => setValue('branchId', val, { shouldValidate: true })}
                >
                  <SelectTrigger className="pl-10 py-3 bg-slate-50 border-[#e0c0b1] rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 h-12">
                    <SelectValue placeholder={branchesLoading ? 'Loading...' : 'Select your branch'} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.branchId && <p className="text-xs text-destructive flex items-center gap-1 mt-1">{errors.branchId.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold tracking-wider text-slate-900">Password</label>
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

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold tracking-wider text-slate-900">Confirm Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary pointer-events-none transition-colors" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-12 py-3 bg-slate-50 border-[#e0c0b1] rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive flex items-center gap-1 mt-1">{errors.confirmPassword.message}</p>}
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
                  Sign up
                  <UserPlus className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#e0c0b1] text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { useLogin } from '../hooks/use-auth';

/** Schema validation — chuẩn zod, message tiếng Việt. */
const loginSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

type LoginValues = z.infer<typeof loginSchema>;

/**
 * Form đăng nhập admin/CTV — react-hook-form + zod.
 * Ví dụ mẫu cho mọi form trong dự án.
 */
export function LoginForm() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    try {
      await login.mutateAsync(values);
    } catch {
      // lỗi hiển thị qua login.error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="auth-form">
      <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
      <Input label="Mật khẩu" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />

      {login.error && (
        <p role="alert" className="field__error">
          {login.error instanceof Error ? login.error.message : 'Đăng nhập thất bại'}
        </p>
      )}

      <Button type="submit" loading={isSubmitting || login.isPending} className="auth-form__submit">
        Đăng nhập
      </Button>
    </form>
  );
}

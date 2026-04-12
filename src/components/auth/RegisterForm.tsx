import type { FormEvent } from 'react';
import type { AuthErrors, RegisterFormValues } from '../../pages/auth/authTypes';
import { AuthField } from './AuthField';

type RegisterFormProps = {
  values: RegisterFormValues;
  errors: AuthErrors;
  isSubmitting: boolean;
  onChange: <K extends keyof RegisterFormValues>(field: K, value: RegisterFormValues[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function RegisterForm({
  values,
  errors,
  isSubmitting,
  onChange,
  onSubmit,
}: RegisterFormProps) {
  return (
    <form className="space-y-4 sm:space-y-4" onSubmit={onSubmit} noValidate>
      <AuthField
        id="username"
        label="用户名"
        placeholder="请输入用户名"
        autoComplete="username"
        value={values.username}
        error={errors.username}
        onChange={(event) => onChange('username', event.target.value)}
      />
      <AuthField
        id="email"
        label="邮箱"
        type="email"
        placeholder="请输入邮箱"
        autoComplete="email"
        value={values.email}
        error={errors.email}
        onChange={(event) => onChange('email', event.target.value)}
      />
      <AuthField
        id="register-password"
        label="密码"
        type="password"
        placeholder="请输入密码"
        autoComplete="new-password"
        value={values.password}
        error={errors.password}
        onChange={(event) => onChange('password', event.target.value)}
      />
      <AuthField
        id="confirm-password"
        label="确认密码"
        type="password"
        placeholder="请再次输入密码"
        autoComplete="new-password"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        onChange={(event) => onChange('confirmPassword', event.target.value)}
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-2xl bg-[#EA5D38] text-[16px] font-medium leading-6 text-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.08)] transition hover:bg-[#e15831] disabled:cursor-not-allowed disabled:opacity-80"
      >
        {isSubmitting ? '注册中...' : '注册'}
      </button>
    </form>
  );
}

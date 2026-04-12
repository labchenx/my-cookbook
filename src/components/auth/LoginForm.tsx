import type { FormEvent } from 'react';
import type { AuthErrors, LoginFormValues } from '../../pages/auth/authTypes';
import { AuthField } from './AuthField';

type LoginFormProps = {
  values: LoginFormValues;
  errors: AuthErrors;
  isSubmitting: boolean;
  onChange: <K extends keyof LoginFormValues>(field: K, value: LoginFormValues[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function LoginForm({ values, errors, isSubmitting, onChange, onSubmit }: LoginFormProps) {
  return (
    <form className="space-y-4 sm:space-y-4" onSubmit={onSubmit} noValidate>
      <AuthField
        id="account"
        label="账号"
        placeholder="邮箱或用户名"
        autoComplete="username"
        value={values.account}
        error={errors.account}
        onChange={(event) => onChange('account', event.target.value)}
      />
      <AuthField
        id="password"
        label="密码"
        type="password"
        placeholder="请输入密码"
        autoComplete="current-password"
        value={values.password}
        error={errors.password}
        onChange={(event) => onChange('password', event.target.value)}
      />
      <div className="flex items-center justify-between pt-[2px]">
        <label className="flex items-center gap-2 text-[16px] font-medium leading-6 text-[#827971]">
          <input
            type="checkbox"
            checked={values.rememberMe}
            onChange={(event) => onChange('rememberMe', event.target.checked)}
            className="h-4 w-4 rounded-[4px] border border-[rgba(45,37,32,0.2)] accent-[#EA5D38]"
          />
          记住我
        </label>
        <button type="button" className="text-[16px] font-medium leading-6 text-[#EA5D38]">
          忘记密码？
        </button>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-[2px] h-12 w-full rounded-2xl bg-[#EA5D38] text-[16px] font-medium leading-6 text-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.08)] transition hover:bg-[#e15831] disabled:cursor-not-allowed disabled:opacity-80"
      >
        {isSubmitting ? '登录中...' : '登录'}
      </button>
    </form>
  );
}

import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthCard } from '../../components/auth/AuthCard';
import { AuthTabs } from '../../components/auth/AuthTabs';
import { LoginForm } from '../../components/auth/LoginForm';
import { RegisterForm } from '../../components/auth/RegisterForm';
import type {
  AuthErrors,
  AuthMode,
  LoginFormValues,
  RegisterFormValues,
} from './authTypes';

const initialLoginValues: LoginFormValues = {
  account: '',
  password: '',
  rememberMe: false,
};

const initialRegisterValues: RegisterFormValues = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginValues, setLoginValues] = useState<LoginFormValues>(initialLoginValues);
  const [registerValues, setRegisterValues] = useState<RegisterFormValues>(initialRegisterValues);
  const [errors, setErrors] = useState<AuthErrors>({});

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrors({});
  };

  const updateLoginField = <K extends keyof LoginFormValues>(field: K, value: LoginFormValues[K]) => {
    setLoginValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const updateRegisterField = <K extends keyof RegisterFormValues>(
    field: K,
    value: RegisterFormValues[K],
  ) => {
    setRegisterValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validateLogin = () => {
    const nextErrors: AuthErrors = {};

    if (!loginValues.account.trim()) {
      nextErrors.account = '请输入邮箱或用户名';
    }

    if (!loginValues.password.trim()) {
      nextErrors.password = '请输入密码';
    }

    return nextErrors;
  };

  const validateRegister = () => {
    const nextErrors: AuthErrors = {};

    if (!registerValues.username.trim()) {
      nextErrors.username = '请输入用户名';
    }

    if (!registerValues.email.trim()) {
      nextErrors.email = '请输入邮箱';
    }

    if (!registerValues.password.trim()) {
      nextErrors.password = '请输入密码';
    }

    if (!registerValues.confirmPassword.trim()) {
      nextErrors.confirmPassword = '请再次输入密码';
    } else if (registerValues.confirmPassword !== registerValues.password) {
      nextErrors.confirmPassword = '两次输入的密码不一致';
    }

    return nextErrors;
  };

  const submitWithValidation = async (nextErrors: AuthErrors, onSuccess: () => void) => {
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await wait(250);
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitWithValidation(validateLogin(), () => navigate('/recipes'));
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitWithValidation(validateRegister(), () => navigate('/recipes'));
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(119deg,#FEF4ED_0%,#FEFDFB_100%)] px-4 py-8 sm:px-8">
      <AuthCard>
        <AuthTabs mode={mode} onChange={handleModeChange} />
        {mode === 'login' ? (
          <LoginForm
            values={loginValues}
            errors={errors}
            isSubmitting={isSubmitting}
            onChange={updateLoginField}
            onSubmit={handleLoginSubmit}
          />
        ) : (
          <RegisterForm
            values={registerValues}
            errors={errors}
            isSubmitting={isSubmitting}
            onChange={updateRegisterField}
            onSubmit={handleRegisterSubmit}
          />
        )}
      </AuthCard>
    </main>
  );
}

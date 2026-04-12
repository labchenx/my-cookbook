export type AuthMode = 'login' | 'register';

export type LoginFormValues = {
  account: string;
  password: string;
  rememberMe: boolean;
};

export type RegisterFormValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type AuthErrors = Partial<Record<string, string>>;

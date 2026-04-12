import type { AuthMode } from '../../pages/auth/authTypes';

type AuthTabsProps = {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
};

const tabBaseClass =
  'flex h-[44px] flex-1 items-center justify-center rounded-xl text-[16px] font-medium leading-6 transition-colors';

export function AuthTabs({ mode, onChange }: AuthTabsProps) {
  return (
    <div
      className="flex h-[52px] rounded-2xl bg-[#FEF4ED] p-1"
      role="tablist"
      aria-label="登录和注册切换"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'login'}
        className={`${tabBaseClass} ${
          mode === 'login'
            ? 'bg-white text-[#2D2520] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.08)]'
            : 'text-[#827971]'
        }`}
        onClick={() => onChange('login')}
      >
        登录
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'register'}
        className={`${tabBaseClass} ${
          mode === 'register'
            ? 'bg-white text-[#2D2520] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.08)]'
            : 'text-[#827971]'
        }`}
        onClick={() => onChange('register')}
      >
        注册
      </button>
    </div>
  );
}

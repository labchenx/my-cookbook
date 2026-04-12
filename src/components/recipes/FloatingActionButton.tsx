import plusIcon from '../../assets/recipes/icon-plus.svg';

type FloatingActionButtonProps = {
  onClick: () => void;
};

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="新建菜谱"
      className="fixed bottom-6 right-5 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#EA5D38] shadow-[0_10px_15px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.08)] transition hover:bg-[#e15831] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#EA5D38] sm:bottom-8 sm:right-8 sm:h-14 sm:w-14"
    >
      <img src={plusIcon} alt="" className="h-5 w-5 sm:h-6 sm:w-6" />
    </button>
  );
}

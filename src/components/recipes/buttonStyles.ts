export const recipeButtonTransition =
  'transition-[background-color,color,border-color,box-shadow] duration-150';

export const recipePrimaryButtonInteractive = `cursor-pointer ${recipeButtonTransition} hover:bg-[#E15831] hover:shadow-[0_4px_10px_rgba(234,93,56,0.18),0_1px_3px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5D38]/25 focus-visible:ring-offset-2`;

export const recipeSecondaryButtonInteractive = `cursor-pointer ${recipeButtonTransition} hover:border-[rgba(234,93,56,0.22)] hover:bg-[#FEF4ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5D38]/15 focus-visible:ring-offset-2`;

export const recipeSoftButtonInteractive = `cursor-pointer ${recipeButtonTransition} hover:bg-[#FCE8DC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5D38]/15 focus-visible:ring-offset-2`;

export const recipeIconButtonInteractive = `cursor-pointer ${recipeButtonTransition} hover:bg-[#FEF4ED] hover:text-[#2D2520] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5D38]/15 focus-visible:ring-offset-2`;

export const recipeDeleteButtonInteractive = `cursor-pointer ${recipeButtonTransition} text-[#827971] hover:bg-[#FFF4EF] hover:text-[#EA5D38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5D38]/15 focus-visible:ring-offset-2`;

export const recipeUploadInteractive = `${recipeButtonTransition} hover:border-[rgba(234,93,56,0.28)] hover:bg-[#FFFBF8] focus-visible-within:outline-none focus-visible-within:ring-2 focus-visible-within:ring-[#EA5D38]/15 focus-visible-within:ring-offset-2`;

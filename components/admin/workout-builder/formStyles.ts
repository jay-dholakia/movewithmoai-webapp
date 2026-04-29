const adminControlBase =
  "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

/** Full-width control under a label (adds top margin for label spacing). */
export const adminSelectClass = `mt-1 w-full ${adminControlBase}`;

export const adminInputClass = `mt-1 w-full ${adminControlBase}`;

/** Same styling without `mt-1` (e.g. standalone search field). */
export const adminControlClass = `w-full ${adminControlBase}`;

/** Narrow number field (e.g. order index). */
export const adminShortNumberClass = `mt-1 w-24 shrink-0 ${adminControlBase}`;

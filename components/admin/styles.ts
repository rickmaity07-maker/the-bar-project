/*
  Plain module on purpose: a string exported from a "use client" file reaches
  server components as a client reference, not as the string itself.
*/
export const INPUT =
  "h-11 w-full rounded-full bg-abyss px-4 text-sm text-foam ring-1 ring-inset ring-foam/20 transition-shadow duration-300 ease-drift placeholder:text-mist/60 focus:outline-none focus:ring-2 focus:ring-buoy";

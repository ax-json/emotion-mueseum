/* anime.js cannot see prefers-reduced-motion — every JS-driven effect gates through here.
   Invariant: the reduced path must land on the FINISHED state, never the empty one. */
export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches

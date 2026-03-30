"use client";

import { useCallback, useTransition } from "react";

/**
 * Gom `useTransition` để hiển thị loading nặng kèm `PendingLoadingOverlay`.
 *
 * @example
 * ```tsx
 * const { isPending, runTransition } = useTransitionLoading();
 * return (
 *   <>
 *     <PendingLoadingOverlay open={isPending} />
 *     <button type="button" onClick={() => runTransition(() => { heavyWork(); })}>
 *       Lưu
 *     </button>
 *   </>
 * );
 * ```
 */
export function useTransitionLoading() {
  const [isPending, startTransition] = useTransition();

  const runTransition = useCallback(
    (fn: () => void) => {
      startTransition(fn);
    },
    [startTransition]
  );

  return { isPending, startTransition, runTransition };
}

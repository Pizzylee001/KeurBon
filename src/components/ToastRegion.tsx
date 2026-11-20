import React from 'react';
import { useKeurBonStore } from '../state/store';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CloseIcon,
  ShieldCheckIcon,
} from './Icons';

export function ToastRegion() {
  const { toasts, dismissToast, language } = useKeurBonStore();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="no-print pointer-events-none fixed right-4 bottom-4 left-4 z-[100] flex max-w-sm flex-col gap-2 sm:right-6 sm:bottom-6 sm:left-auto sm:w-full"
    >
      {toasts.map((toast) => {
        const isError = toast.tone === 'error';
        const isSuccess = toast.tone === 'success';

        const borderColor = isError
          ? 'border-[#A62329]'
          : isSuccess
            ? 'border-[#0C5C44]'
            : 'border-[#637683]';

        const accentText = isError
          ? 'text-[#A62329]'
          : isSuccess
            ? 'text-[#0C5C44]'
            : 'text-[#0E1E2B]';

        return (
          <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            className={`kb-sheet-active pointer-events-auto flex items-start justify-between gap-3 border ${borderColor} bg-[#FAFBF9] p-3.5 text-[#0E1E2B]`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <span className={`mt-0.5 shrink-0 ${accentText}`}>
                {isError ? (
                  <AlertTriangleIcon size={18} />
                ) : isSuccess ? (
                  <CheckCircleIcon size={18} />
                ) : (
                  <ShieldCheckIcon size={18} />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-[#0E1E2B]">
                  {toast.title}
                </p>
                {toast.detail ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-[#3D515F] break-words">
                    {toast.detail}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label={language === 'fr' ? 'Fermer la notification' : 'Dismiss notification'}
              className="kb-pressable inline-flex size-[44px] shrink-0 items-center justify-center rounded-[6px] text-[#3D515F] hover:bg-[#E3E9E5] hover:text-[#0E1E2B]"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

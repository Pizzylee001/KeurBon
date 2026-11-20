import React from 'react';
import type { PurposeCategory } from '../types/keurbon';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function KeurBonMark({ size = 28, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <rect
        x="2"
        y="3"
        width="24"
        height="22"
        rx="4"
        fill="#FAFBF9"
        stroke="#0E1E2B"
        strokeWidth="1.75"
      />
      <path
        d="M2 15H6M22 15H26"
        stroke="#0C5C44"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8.5 15H19.5"
        stroke="#CFD8D4"
        strokeWidth="1.5"
        strokeDasharray="2.5 2.5"
      />
      <rect
        x="7"
        y="7.5"
        width="6"
        height="4.5"
        rx="1"
        fill="#0C5C44"
      />
      <circle cx="18.5" cy="9.75" r="2.25" fill="#9B5305" />
      <path
        d="M7 19.5H15M18 19.5H21"
        stroke="#0E1E2B"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LockSealIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8 11V7a4 4 0 0 1 8 0v4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16" r="1.25" fill="currentColor" />
    </svg>
  );
}

export function ShieldCheckIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path
        d="M12 3L4.5 6.2V11.8C4.5 16.5 7.7 20.6 12 21.8C16.3 20.6 19.5 16.5 19.5 11.8V6.2L12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M8.75 12.25L11 14.5L15.5 9.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckCircleIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8.5 12.25L10.8 14.5L15.75 9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path
        d="M12 4L3.2 19H20.8L12 4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 10V13.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function ClockLockIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <circle
        cx="12"
        cy="12"
        r="8.75"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M12 7.5V12L15 13.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CopyIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <rect
        x="8.5"
        y="8.5"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M5.5 15.5H4.8C4.08 15.5 3.5 14.92 3.5 14.2V4.8C3.5 4.08 4.08 3.5 4.8 3.5H14.2C14.92 3.5 15.5 4.08 15.5 4.8V5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PrintIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path
        d="M7 8V4H17V8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <rect
        x="4"
        y="8"
        width="16"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="7"
        y="14"
        width="10"
        height="6"
        rx="1"
        fill="#FAFBF9"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

export function QrCodeIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M14 14H16.5V16.5H14V14ZM17.5 17.5H20V20H17.5V17.5ZM14 18.5H16M18.5 14V16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RefreshIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path
        d="M20 11A8 8 0 0 0 6.3 6.3L4 8.5M4 4.5V8.5H8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 13A8 8 0 0 0 17.7 17.7L20 15.5M20 19.5V15.5H16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KeyIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <circle
        cx="8.5"
        cy="12"
        r="4.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M12.75 12H20.5M17.5 12V15M20.25 12V14.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StoreCounterIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path
        d="M4 9.5L5.6 4.5H18.4L20 9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M4 9.5H20V19.5H4V9.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 19.5V14H14.5V19.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

export function SendVoucherIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <rect
        x="3.5"
        y="6"
        width="17"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M14 6V18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
      <path
        d="M7 10.5H10.5M7 13.5H9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MenuBarsIcon({ size = 20, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path
        d="M4 7H20M4 12H20M4 17H20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CloseIcon({ size = 20, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SpinnerRingIcon({ size = 16, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`kb-spinner ${className ?? ''}`}
      {...rest}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DownloadIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path
        d="M12 4V15M12 15L8 11M12 15L16 11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 18.5H19.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function UploadIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path
        d="M12 15V4M12 4L8 8M12 4L16 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 18.5H19.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CategoryIcon({
  category,
  size = 18,
  className,
  ...rest
}: IconProps & { category: PurposeCategory }) {
  switch (category) {
    case 'health':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
          {...rest}
        >
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M12 8V16M8 12H16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'school':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
          {...rest}
        >
          <path
            d="M4 6.5C4 5.67 4.67 5 5.5 5H11V19H5.5C4.67 19 4 18.33 4 17.5V6.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M20 6.5C20 5.67 19.33 5 18.5 5H13V19H18.5C19.33 19 20 18.33 20 17.5V6.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
        </svg>
      );
    case 'hardware':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
          {...rest}
        >
          <path
            d="M14.5 5.5L18.5 9.5M6 18L13.5 10.5L15.5 12.5L8 20H6V18Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M12.5 7.5L15 5L19 9L16.5 11.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'groceries':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
          {...rest}
        >
          <path
            d="M5 9.5H19L17.5 19.5H6.5L5 9.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 9.5L10.5 4.5M15.5 9.5L13.5 4.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'electricity':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
          {...rest}
        >
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M13 6.5L8.5 12.5H12.5L11 17.5L15.5 11.5H11.5L13 6.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

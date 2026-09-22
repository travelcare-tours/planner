import React from 'react';

/**
 * Pure vector SVG components for UPI payment providers.
 * Using inline SVGs guarantees 100% rendering reliability inside html2canvas / html2pdf
 * and eliminates issues with missing dimensions, external requests, basePaths, or canvas image tainting.
 */

export const UpiSvg: React.FC<{ className?: string }> = ({ className = "h-4 w-auto" }) => (
  <svg viewBox="0 0 120 60" width="120" height="60" className={className} fillRule="evenodd">
    <path d="M95.678 42.9L110 29.835l-6.784-13.516z" fill="#097939" />
    <path d="M90.854 42.9l14.322-13.065-6.784-13.516z" fill="#ed752e" />
    <path d="M22.41 16.47l-6.03 21.475 21.407.15 5.88-21.625h5.427l-7.05 25.14c-.27.96-1.298 1.74-2.295 1.74H12.31c-1.664 0-2.65-1.3-2.2-2.9l6.724-23.98zm66.182-.15h5.427l-7.538 27.03h-5.58zM49.698 27.582l27.136-.15 1.81-5.707H51.054l1.658-5.256 29.4-.27c1.83-.017 2.92 1.4 2.438 3.167L81.78 29.49c-.483 1.766-2.36 3.197-4.19 3.197H53.316L50.454 43.8h-5.28z" fill="#747474" />
  </svg>
);

export const GPaySvg: React.FC<{ className?: string }> = ({ className = "h-4.5 w-auto" }) => (
  <svg viewBox="0 0 124 105" width="124" height="105" className={className}>
    {/* Blue loop */}
    <path d="M65.7 63.18l30.4-52.66 16.56 9.56c10.69 6.17 14.36 19.85 8.18 30.54l-17.12 29.65c-3.86 6.68-12.4 8.97-19.09 5.12l-15.37-8.87c-3.66-2.71-5.26-8.68-2.56-13.34z" fill="#4285F4" />
    {/* Yellow loop */}
    <path d="M62.46 26.62l-37.82 65.5 16.56 9.56c10.69 6.17 24.37 2.51 30.54-8.18l24.53-42.49c3.86-6.68 1.57-15.23-5.12-19.09l-15.37-8.87c-4.66-2.7-10.62-1.1-13.32 3.57z" fill="#FBBC04" />
    {/* Green loop */}
    <path d="M96.1 10.51L84.38 3.75C71.02-3.97 53.93.61 46.21 13.98L24.47 51.62c-3.86 6.68-1.57 15.23 5.12 19.09l11.72 6.76c6.68 3.86 15.23 1.57 19.09-5.12l25.95-44.95c5.39-9.34 17.33-12.53 26.66-7.14L96.1 10.51z" fill="#34A853" />
    {/* Red loop */}
    <path d="M49.58 25.01l-12.93-7.45c-5.76-3.32-13.13-1.35-16.46 4.4L4.67 48.77c-7.64 13.2-3.11 30.08 10.12 37.7l9.85 5.67 11.94 6.88 5.18 2.98c-9.2-6.16-12.12-18.5-6.5-28.21l4.02-6.94 14.71-25.42c3.45-5.94 1.48-13.3-4.29-16.62z" fill="#EA4335" />
  </svg>
);

export const PhonePeSvg: React.FC<{ className?: string }> = ({ className = "h-4.5 w-auto" }) => (
  <svg viewBox="0 0 512 512" width="512" height="512" className={className}>
    {/* Clean circular purple background */}
    <circle cx="256" cy="256" r="256" fill="#5f259f" />
    {/* White 'पे' character */}
    <path d="M372.164 189.203c0-10.008-8.576-18.593-18.584-18.593h-34.323l-78.638-90.084c-7.154-8.577-18.592-11.439-30.03-8.577l-27.17 8.577c-4.292 1.43-5.723 7.154-2.862 10.007l85.8 81.508H136.236c-4.293 0-7.154 2.861-7.154 7.154v14.292c0 10.016 8.585 18.592 18.592 18.592h20.015v68.639c0 51.476 27.17 81.499 72.931 81.499 14.292 0 25.739-1.431 40.03-7.146v45.753c0 12.87 10.016 22.886 22.885 22.886h20.015c4.293 0 8.577-4.293 8.577-8.586V210.648h32.893c4.292 0 7.145-2.861 7.145-7.145v-14.3zM280.65 312.17c-8.576 4.292-20.015 5.723-28.591 5.723-22.886 0-34.324-11.438-34.324-37.176v-68.639h62.915v100.092z" fill="#ffffff" />
  </svg>
);

export const PaytmSvg: React.FC<{ className?: string }> = ({ className = "h-3.5 w-auto" }) => (
  <svg viewBox="0 0 123 39" width="123" height="39" className={className}>
    {/* Dark Blue "Pay" */}
    <path fill="#20336B" d="M65.69 6.2h-5.48c-.66 0-1.21.54-1.21 1.21v11.33c-.01.7-.58 1.26-1.28 1.26h-2.29c-.71 0-1.29-.57-1.29-1.28L54.12 7.41c0-.67-.54-1.21-1.21-1.21h-5.48c-.67 0-1.21.54-1.21 1.21v12.41c0 4.71 3.36 8.08 8.08 8.08 0 0 3.54 0 3.65.02.64.07 1.13.61 1.13 1.27 0 .65-.48 1.19-1.12 1.27-.03 0-.06.01-.09.02l-8.01.03c-.67 0-1.21.54-1.21 1.21v5.47c0 .67.54 1.21 1.21 1.21h8.95c4.72 0 8.08-3.36 8.08-8.07V7.41c.21-.67-.33-1.21-1-1.21zM34.53 6.23h-7.6c-.67 0-1.22.51-1.22 1.13v2.13c0 .01 0 .03 0 .04 0 .02 0 .03 0 .05v2.92c0 .66.58 1.21 1.29 1.21h7.24c.57.09 1.02.51 1.09 1.16v.71c-.06.62-.51 1.07-1.06 1.12h-3.58c-4.77 0-8.16 3.17-8.16 7.61v6.37c0 4.42 2.92 7.56 7.65 7.56h9.93c1.78 0 3.23-1.35 3.23-3.01V14.45c0-5.04-2.6-8.22-8.81-8.22zM35.4 29.09v.86c0 .07-.01.14-.02.2-.01.06-.03.12-.05.18-.17.48-.65.83-1.22.83h-2.28c-.71 0-1.29-.54-1.29-1.21v-1.03c0-.01 0-.03 0-.04l0-2.75v-.86l0-.01c0-.66.58-1.2 1.29-1.2h2.28c.71 0 1.29.54 1.29 1.21zM13.16 6.19H1.19C.53 6.19 0 6.73 0 7.38v5.37c0 .01 0 .02 0 .03 0 .03 0 .05 0 .07v24.29c0 .66.49 1.2 1.11 1.21h5.58c.67 0 1.21-.54 1.21-1.21l.02-8.32h5.24c4.38 0 7.44-3.04 7.44-7.45v-7.72C20.6 9.25 17.54 6.19 13.16 6.19L13.16 6.19zM12.68 16.23v3.38c0 .71-.57 1.29-1.28 1.29l-3.47 0v-6.77h3.47c.71 0 1.28.57 1.28 1.28z" />
    {/* Cyan "tm" */}
    <path fill="#00BAF2" d="M122.47 11.36c-1.12-3.19-4.16-5.48-7.72-5.48h-.08c-2.32 0-4.41.97-5.9 2.52-1.49-1.55-3.58-2.52-5.9-2.52h-.07c-2.04 0-3.91.75-5.34 1.98V7.24c-.05-.63-.56-1.12-1.2-1.12h-5.48c-.67 0-1.21.54-1.21 1.21v29.74c0 .67.54 1.21 1.21 1.21h5.48c.61 0 1.12-.46 1.19-1.04l0-21.35c0-.08 0-.14.01-.21.09-.95.79-1.74 1.89-1.83h1.01c.46.04.85.2 1.15.45.48.38.74.96.74 1.6l.02 21.24c0 .67.54 1.22 1.21 1.22h5.48c.65 0 1.17-.51 1.2-1.15l0-21.33c0-.7.32-1.34.89-1.71.28-.18.62-.3 1.01-.34h1.01c1.19.1 1.9 1 1.9 2.05l.02 21.22c0 .67.54 1.21 1.21 1.21h5.48c.64 0 1.17-.5 1.21-1.13V13.91c.39-1.31.22-1.92 0-2.55zM85.39 6.2h-3.13V1.12c0-.01 0-.01 0-.02-.01-.6-.49-1.1-1.11-1.1-.07 0-.14.01-.21.02-3.47.95-2.78 5.76-9.12 6.17h-.61c-.09 0-.18.01-.27.03h-.01l.01 0c-.57.13-.98.61-.98 1.19v5.48c0 .67.54 1.21 1.21 1.21h3.3l-.01 23.22c0 .66.54 1.2 1.2 1.2h5.42c.66 0 1.2-.54 1.2-1.2l0-23.22h3.07c.66 0 1.21-.55 1.21-1.21V7.41c0-.67-.54-1.21-1.21-1.21z" />
  </svg>
);

// Formatted White Pill Badges for PDF Payment Section
export const UpiLogoBadge: React.FC = () => (
  <span className="inline-flex items-center justify-center px-2 py-1 bg-white rounded-md shadow-2xs border border-slate-200/90 h-7" title="UPI">
    <UpiSvg className="h-4 w-auto max-h-5" />
  </span>
);

export const GPayLogoBadge: React.FC = () => (
  <span className="inline-flex items-center justify-center px-2 py-1 bg-white rounded-md shadow-2xs border border-slate-200/90 h-7" title="Google Pay">
    <GPaySvg className="h-4.5 w-auto max-h-5" />
  </span>
);

export const PhonePeLogoBadge: React.FC = () => (
  <span className="inline-flex items-center justify-center px-2 py-1 bg-white rounded-md shadow-2xs border border-slate-200/90 h-7" title="PhonePe">
    <PhonePeSvg className="h-4.5 w-auto max-h-5" />
  </span>
);

export const PaytmLogoBadge: React.FC = () => (
  <span className="inline-flex items-center justify-center px-2 py-1 bg-white rounded-md shadow-2xs border border-slate-200/90 h-7" title="Paytm">
    <PaytmSvg className="h-3.5 w-auto max-h-5" />
  </span>
);

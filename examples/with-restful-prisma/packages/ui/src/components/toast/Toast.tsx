/* eslint-disable jsx-a11y/control-has-associated-label */
import React from 'react';
import {
  ToastCloseIcon,
  ToastErrorIcon,
  ToastSuccessIcon,
  ToastWarningIcon,
} from './icons';

interface ToastProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > {
  type?: 'success' | 'error' | 'warning' | 'info';
  onDelete?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export default function Toast({
  type = 'info',
  id = '',
  onDelete,
  children,
  ...rest
}: ToastProps) {
  switch (type) {
    case 'success':
      return (
        <div
          className="max-w-xs mb-3 rounded text-white-100 w-full mx-auto px-4 py-2 bg-white border-l-2 border-green-500 z-50 shadow-lg "
          role="alert"
          style={{ zIndex: 200 }}
          {...rest}
        >
          <div className="w-full flex items-center">
            <div className="flex mr-3 h-full ">
              <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-100 bg-green-100 rounded-full ">
                <ToastSuccessIcon className="w-6 h-6 text-green-500 m-auto" />
              </div>
            </div>
            <div className="flex flex-row flex-wrap flex-grow pl-1">
              <span className="w-full flex flex-row flex-wrap">
                <p className="font-semibold text-green-500">¡Éxito! </p>
                <button
                  type="button"
                  className="ml-auto p-0 bg-transparent focus:outline-none outline-none"
                  data-id={id}
                  onClick={onDelete}
                >
                  <ToastCloseIcon className="w-4 h-4" />
                </button>
              </span>

              {typeof children === 'string' ? (
                <p className="text-neutral-700 ">{children}</p>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      );
    case 'error':
      return (
        <div
          className="max-w-xs mb-3 rounded w-full mx-auto px-4 py-2 bg-white border-l-2 border-red-500   z-50 shadow-lg "
          role="alert"
          style={{ zIndex: 200 }}
          {...rest}
        >
          <div className="w-full flex flex-row items-center">
            <div className="flex mr-3  h-full items-center">
              <div className="inline-flex items-center justify-center flex-shrink-0 w-9 h-9 text-red-100 bg-red-100 rounded-full ">
                <ToastErrorIcon className="w-6 h-6 text-red-500 m-auto" />
              </div>
            </div>
            <div className="flex flex-row flex-wrap flex-grow pl-1">
              <span className="w-full flex flex-row flex-wrap">
                <p className="font-semibold text-red-500">¡Error!</p>
                <button
                  type="button"
                  className="ml-auto p-0 bg-transparent focus:outline-none outline-none"
                  data-id={id}
                  onClick={onDelete}
                >
                  <ToastCloseIcon className="w-4 h-4" />
                </button>
              </span>
              {typeof children === 'string' ? (
                <p className="text-neutral-700">{children}</p>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      );
    case 'warning':
      return (
        <div
          className="max-w-xs mb-3 bg-white rounded text-neutral-400 w-full mx-auto px-4 py-2 border-l-2 border-yellow-500 z-50 shadow-lg "
          role="alert"
          style={{ zIndex: 200 }}
          {...rest}
        >
          <div className="w-full flex flex-row  items-center">
            <div className="flex h-full mr-3 items-center">
              <div className="inline-flex items-center justify-center flex-shrink-0 w-9 h-9 text-yellow-400 bg-yellow-100 rounded-full  ">
                <ToastWarningIcon className="w-6 h-6 text-yellow-500 m-auto" />
              </div>
            </div>
            <div className="flex flex-row flex-wrap flex-grow pl-1">
              <span className="w-full flex flex-row flex-wrap">
                <p className="font-semibold text-yellow-500">¡Cuidado!</p>
                <button
                  type="button"
                  className="ml-auto p-0 bg-transparent focus:outline-none outline-none"
                  data-id={id}
                  onClick={onDelete}
                >
                  <svg
                    fill="currentColor"
                    className="w-4 h-4"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>

              {typeof children === 'string' ? (
                <p className="text-neutral-700 ">{children}</p>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      );
    case 'info':
      return (
        <div
          className="max-w-xs mb-3 bg-white rounded w-full mx-auto px-4 py-2 border-l-2 border-blue-200 z-50 shadow-lg"
          role="alert"
          style={{ zIndex: 200 }}
          {...rest}
        >
          <div className="w-full flex flex-row  items-center">
            <div className="w-6 h-6 flex m-auto mr-5">
              <div className="flex h-full items-center">
                <div className="inline-flex items-center justify-center flex-shrink-0 w-9 h-9 text-blue-400 bg-blue-50 rounded-full  ">
                  <svg
                    className="w-6 h-6 text-blue-300 m-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex flex-row flex-wrap flex-grow pl-1">
              <span className="w-full flex flex-row flex-wrap">
                <p className="font-semibold text-blue-300">Información</p>
                <button
                  type="button"
                  className="ml-auto p-0 bg-transparent focus:outline-none outline-none"
                  data-id={id}
                  onClick={onDelete}
                >
                  <svg
                    fill="currentColor"
                    className="w-4 h-4"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>

              {typeof children === 'string' ? (
                <p className="text-neutral-700 ">{children}</p>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

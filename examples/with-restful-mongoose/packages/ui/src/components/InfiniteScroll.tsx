import React from 'react';
import { Pagination } from '@repo/schemas';
import { SpinnerIcon } from '../icons';

/**
 * Infinite scroll component for paginated data (with up and down scroll)
 * @param triggerFunctionOnHit - trigger setPagination function when the user hits the top or the bottom of the container
 * @param loading - loading state[{ _id?: string; src: string; alt: string; }]
 * @param data - paginated data
 * @param setPagination - function to set the pagination
 * @param children - children to render (map over loaded data to show the data)
 * @param pagination - pagination object
 * @param setLoadedData - function to set the loaded data
 * @param className.container - className for the container HERE YOU HAVE TO SET THE MAX HEIGHT OF THE CONTAINER
 * @param className.loadingComponent - className for the loading component
 * @param maxHeight - maxHeight to trigger the function (in px) ONLY WHEN fixedHeight is true
 * @param updateLoadedDataOnPageChange - if true, the loaded data will be updated when the page changes, if not, the loaded data must be changed manually
 * @param fixedHeight - if true, the container will have a fixed height, if not, the container will have the height of the content and the function will be triggered when the user hits the bottom of the container (USES WINDOW SCROLL)
 * @returns InfiniteScroll component
 */
function InfiniteScroll({
  triggerFunctionOnHit = 'bottom',
  loading,
  data,
  setPagination,
  children,
  setLoadedData,
  maxHeight = 0,
  updateLoadedDataOnPageChange = true,
  fixedHeight = true,
  className,
}: {
  triggerFunctionOnHit?: 'top' | 'bottom';
  loading: boolean;
  data: Pagination<any>;
  setPagination: React.Dispatch<
    React.SetStateAction<{ page: number; perPage: number }>
  >;
  children: React.ReactNode;
  setLoadedData: React.Dispatch<React.SetStateAction<any[]>>;
  maxHeight?: number;
  updateLoadedDataOnPageChange?: boolean;
  fixedHeight?: boolean;
  className?: {
    container?: string;
    loadingComponent?: string;
  };
}) {
  const [maxHeight_, setMaxHeight_] = React.useState(maxHeight);
  const [data_, setData_] = React.useState(data);
  const TRIGGER_FUNCTION_TOP = 'top';
  const TRIGGER_FUNCTION_BOTTOM = 'bottom';
  const containerRef = React.useRef<HTMLDivElement>(null);
  const loadingRef = React.useRef<HTMLDivElement>(null);

  const loadMoreData = () => {
    if (data_?.pageInfo?.hasNextPage && !loading)
      setPagination((prev: { page: number; perPage: number }) => ({
        ...prev,
        page: data_.pageInfo.page + 1,
      }));
  };

  const handleScrollDiv = () => {
    // handle scroll for div (if fixedHeight is true)
    const scrollHeight = containerRef?.current?.scrollHeight;
    const scrollTop =
      (containerRef?.current?.scrollTop ?? 0) +
      (loadingRef?.current?.offsetHeight ?? 0);
    if (
      (triggerFunctionOnHit === TRIGGER_FUNCTION_BOTTOM &&
        (scrollHeight ?? 0) <= maxHeight_ + scrollTop) ||
      (triggerFunctionOnHit === TRIGGER_FUNCTION_TOP &&
        scrollTop * -1 + maxHeight_ >= (scrollHeight ?? 0))
    ) {
      loadMoreData();
    }
  };

  React.useEffect(() => {
    if (data) {
      setData_(data);
      // if page > 1 the user is scrolling and has to see more options
      if (updateLoadedDataOnPageChange) {
        setLoadedData((prev) => [...prev, ...(data?.items ?? [])]);
      }

      // if page === 1 the user is searching and has to see only the new options
      if (Number(data?.pageInfo?.page) === 1 && updateLoadedDataOnPageChange) {
        setLoadedData([...(data?.items ?? [])]);
      }
      // setPages(Math.ceil(data.count / data.pageInfo.perPage));
    }
  }, [data]);

  React.useEffect(() => {
    // if the screen is to large and the div doesn't have scroll, load more data
    if (
      data_ &&
      (containerRef?.current?.offsetHeight ?? 0) < maxHeight_ &&
      (containerRef?.current?.offsetHeight ?? 0) > 0 &&
      Number(data_?.pageInfo?.page) === 1 &&
      data_?.items?.length > (loadingRef?.current?.offsetHeight ?? 0) &&
      data_?.pageInfo?.hasNextPage &&
      fixedHeight
    ) {
      loadMoreData();
    }
  }, [containerRef?.current?.offsetHeight]);

  React.useEffect(() => {
    if (maxHeight === 0 && typeof window !== 'undefined' && fixedHeight)
      setMaxHeight_(window.innerHeight - 120); // screen height - (navbar height+40px)
  }, [maxHeight]);

  React.useEffect(() => {
    // handle scroll for window (if fixedHeight is false)
    const handleScrollWindow = () => {
      const windowHeight = window.innerHeight;
      const scrollTop =
        (document.documentElement?.scrollTop ?? 0) +
        (loadingRef.current?.offsetHeight ?? 0);
      const { scrollHeight } = document.documentElement;

      if (
        (windowHeight + scrollTop >= 0.9 * scrollHeight &&
          triggerFunctionOnHit === TRIGGER_FUNCTION_BOTTOM) ||
        (scrollTop * -1 + windowHeight <= scrollHeight &&
          triggerFunctionOnHit === TRIGGER_FUNCTION_TOP)
      ) {
        loadMoreData();
      }
    };

    if (!fixedHeight) {
      window.addEventListener('scroll', handleScrollWindow);
      return () => {
        window.removeEventListener('scroll', handleScrollWindow);
      };
    }
  }, [data_, fixedHeight, triggerFunctionOnHit]);

  return (
    <div
      ref={fixedHeight ? containerRef : undefined}
      className={`w-full ${className?.container} ${fixedHeight ? 'overflow-y-auto' : ''
        }`}
      style={{
        ...(fixedHeight ? { maxHeight: `${maxHeight_}px` } : {}),
      }}
      onScroll={fixedHeight ? handleScrollDiv : undefined}
    >
      {children}
      <div
        ref={loadingRef}
        className={`w-full flex justify-center items-center ${data_?.pageInfo?.hasNextPage ? 'h-12 my-6' : ''
          }`}
      >
        {loading && data_?.pageInfo?.hasNextPage && (
          <SpinnerIcon
            className={` w-12 h-12 text-gray-200 animate-spin  fill-primary-500 ${className?.loadingComponent}  `}
          />
        )}
      </div>
    </div>
  );
}

export default InfiniteScroll;

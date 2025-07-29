import React from 'react';

function Skeleton() {
  const ref = React.useRef(null);
  const [height, setHeight] = React.useState(0);

  React.useEffect(() => {
    setHeight(
      (ref?.current ? (ref?.current as HTMLElement) : null)?.clientHeight ?? 0
    );
  }, []);

  if (!height || height === 0) <div />;

  return (
    <div className="flex flex-col flex-1 gap-5 sm:p-2" ref={ref}>
      <div className="flex flex-1 flex-col gap-3">
        <div className="bg-gray-200 w-full animate-pulse h-14 rounded-2xl" />
        {Array.from({ length: Math.min(Math.ceil(height / 50), 5) }).map(
          (_, index) => (
            <div
              key={`skeleton-${index}`}
              className="bg-gray-200 w-full animate-pulse h-3 rounded-2xl"
            />
          )
        )}
      </div>
      <div className="bg-gray-200 w-full animate-pulse flex-grow rounded-2xl" />
      <div className="mt-auto flex gap-3">
        <div className="bg-gray-200 w-20 h-8 animate-pulse rounded-full" />
        <div className="bg-gray-200 w-20 h-8 animate-pulse rounded-full" />
        <div className="bg-gray-200 w-20 h-8 animate-pulse rounded-full ml-auto" />
      </div>
    </div>
  );
}

export default Skeleton;

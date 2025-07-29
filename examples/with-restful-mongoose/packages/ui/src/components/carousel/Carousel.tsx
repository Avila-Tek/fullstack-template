'use client';

import React from 'react';
import { type CarouselState, useCarousel } from './hooks/useCarousel';
import { Slide } from './Slide';

const defaultCarouselContainerWidth = 10000;

type CarouselProps = {
  children: React.ReactNode;
  wrapperClasses?: string;
} & Omit<CarouselState, 'carouselContainerRef' | 'carouselOffset'>;

export function Carousel({
  children,
  wrapperClasses = '',
  ...rest
}: CarouselProps) {
  const carouselContainerRef = React.useRef<HTMLDivElement | null>(null);
  const carouselInitialState = React.useMemo(
    () => ({
      ...rest,
      carouselContainerRef,
    }),
    [rest]
  );
  const { carouselState, helpers } = useCarousel(carouselInitialState);

  return (
    <div className="w-full overflow-hidden">
      <div
        ref={carouselContainerRef}
        className={`flex flex-1 flex-wrap justify-between snap-x ${wrapperClasses}`}
        style={{
          width: carouselState.slideWidth
            ? carouselState.totalSlides * carouselState.slideWidth
            : defaultCarouselContainerWidth,
          transform: `translateX(-${carouselState.carouselOffset}px)`,
          transition: `${
            carouselState.isPlaying ? 'transform 1s ease' : 'none'
          }`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export { Slide };

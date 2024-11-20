'use client';

import React from 'react';
// import 'swiper/css';
// import 'swiper/css/navigation';
// import 'swiper/css/pagination';
// import 'swiper/css/scrollbar';
import {
  Autoplay,
  Keyboard,
  Mousewheel,
  Navigation,
  Pagination,
} from 'swiper/modules';
import {
  Swiper,
  SwiperClass,
  SwiperProps,
  SwiperSlide,
  SwiperSlideProps,
} from 'swiper/react';
import useWindowSize from '../../hooks/useWindowSize';
import SliderButton from './SliderButton';

interface SliderSwiperProps {
  // items or cards to show
  children: React.ReactNode[];
  // breakpoints to change the number of slides per view
  breakpoints?: {
    slidesPerView?: number;
    spaceBetween?: number;
    [key: string]: any;
  };
  // buttons to show to navigate between slides
  buttonOptions?: {
    showControls?: boolean;
    customLeftIcon?: React.ReactNode;
    customRightIcon?: React.ReactNode;
  };
  // props to pass to the Swiper component https://swiperjs.com/react#swiper-props
  swiperProps?: SwiperProps;
  // props to pass to the SwiperSlide component https://swiperjs.com/react#swiperslide-props
  SwiperSlideProps?: SwiperSlideProps;
}

/**
 * @name SliderSwiper
 * @description A slider component that uses Swiper to render the slides of carousel
 *
 */
export default function SliderWrapperSwiper({
  children,
  breakpoints,
  buttonOptions,
  ...props
}: SliderSwiperProps) {
  const size = useWindowSize();
  const [swiperRef, setSwiperRef] = React.useState<SwiperClass>();

  const handlePrevious = React.useCallback(() => {
    swiperRef?.slidePrev();
  }, [swiperRef]);

  const handleNext = React.useCallback(() => {
    swiperRef?.slideNext();
  }, [swiperRef]);

  // calculate the number of slides per view based on the current breakpoint
  const currentSlidesPerView = React.useMemo(() => {
    let slidesPerViewValue = 1; // default value

    // Iterate over the breakpoints and get the first one that matches
    const sortedBreakpoints = Object.keys(breakpoints ?? {}).sort(
      (a, b) => parseInt(b) - parseInt(a)
    );
    for (const bp of sortedBreakpoints) {
      if (size.width && size.width >= parseInt(bp)) {
        slidesPerViewValue = breakpoints?.[bp].slidesPerView || 1;
        break;
      }
    }
    return slidesPerViewValue;
  }, [breakpoints, size.width]);

  return (
    <div className="w-full h-full overflow-x-scroll overflow-y-hidden hide-scrollbar flex flex-row  ">
      {currentSlidesPerView < children.length && buttonOptions?.showControls ? (
        <SliderButton position="left" handleClick={handlePrevious} />
      ) : null}
      <Swiper
        onSwiper={setSwiperRef}
        breakpoints={breakpoints}
        cssMode
        keyboard
        modules={[Autoplay, Pagination, Navigation, Mousewheel, Keyboard]}
        className="mySwiper w-full h-full"
        {...props}
      >
        {children.map((child, index) => (
          <SwiperSlide key={index}>{child}</SwiperSlide>
        ))}
      </Swiper>
      {currentSlidesPerView < children.length && buttonOptions?.showControls ? (
        <SliderButton position="right" handleClick={handleNext} />
      ) : null}
    </div>
  );
}

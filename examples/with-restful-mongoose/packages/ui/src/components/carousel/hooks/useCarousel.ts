import React from 'react';

// TODO: Missing features to be implemented.
// - Responsive by default.
// - Touch events.
// - ARIA compliant.

type Direction = 'forward' | 'backward';
// See: https://github.com/typescript-eslint/typescript-eslint/issues/2483
// eslint-disable-next-line no-shadow
enum Action {
  NEXT_SLIDE = 'NEXT_SLIDE',
  PREVIOUS_SLIDE = 'PREVIOUS_SLIDE',
  STOP_CAROUSEL = 'STOP_CAROUSEL',
  UPDATE_SLIDE_WIDTH = 'UPDATE_SLIDE_WIDTH',
  UPDATE_SLIDE_HEIGHT = 'UPDATE_SLIDE_HEIGHT',
  GO_TO_SLIDE = 'GO_TO_SLIDE',
  UPDATE_VISIBLE_SLIDES = 'UPDATE_VISIBLE_SLIDEs',
  UPDATE_OFFSET = 'UPDATE_OFFSET',
}
type ActionObject = { type: Action; payload?: number };

export type CarouselState = {
  carouselContainerRef: React.MutableRefObject<HTMLDivElement | null> | null;
  currentSlide: number;
  totalSlides: number;
  isPlaying: boolean;
  slideInterval?: number;
  direction?: Direction;
  step?: number;
  slideWidth?: number;
  slideHeight?: number;
  visibleSlides?: number;
  carouselOffset?: number;
};

function reducer(state: CarouselState, action: ActionObject): CarouselState {
  switch (action.type) {
    case Action.PREVIOUS_SLIDE:
      return {
        ...state,
        currentSlide:
          state.currentSlide > 0
            ? state.currentSlide - 1
            : state.totalSlides - 1,
        carouselOffset:
          state.currentSlide > 0
            ? state.currentSlide * (state.slideWidth ?? 0)
            : 0,
      };
    case Action.NEXT_SLIDE:
      return {
        ...state,
        currentSlide:
          state.currentSlide >= state.totalSlides - 1
            ? 0
            : state.currentSlide + 1,
        carouselOffset:
          state.currentSlide >= state.totalSlides - 1
            ? 0
            : (state.currentSlide + 1) * (state.slideWidth ?? 0),
      };
    case Action.STOP_CAROUSEL:
      return { ...state, isPlaying: false };
    case Action.UPDATE_SLIDE_WIDTH:
      return { ...state, slideWidth: action?.payload ?? 0 };
    case Action.UPDATE_SLIDE_HEIGHT:
      return { ...state, slideHeight: action?.payload ?? 0 };
    case Action.GO_TO_SLIDE:
      return {
        ...state,
        currentSlide: action?.payload ?? 0,
        carouselOffset:
          state.currentSlide >= state.totalSlides
            ? 0
            : (action?.payload ?? 0) * (state.slideWidth ?? 0),
      };
    case Action.UPDATE_VISIBLE_SLIDES:
      return { ...state, visibleSlides: action?.payload ?? 0 };
    case Action.UPDATE_OFFSET:
      return { ...state, carouselOffset: action?.payload ?? 0 };
    default:
      throw new Error('The selected Carousel Action is not defined.');
  }
}

export function useCarousel({ ...rest }: CarouselState) {
  const firstSlideDOMRect = rest?.carouselContainerRef?.current?.children
    ?.item(0)
    ?.getBoundingClientRect();

  const [carouselState, dispatch] = React.useReducer(reducer, {
    ...rest,
    carouselOffset:
      firstSlideDOMRect?.width && rest?.currentSlide
        ? (firstSlideDOMRect?.width ?? 0) * rest.currentSlide
        : 0,
  });

  const isAtFirstSlide = React.useMemo(
    () => carouselState?.currentSlide === 0,
    [carouselState?.currentSlide]
  );
  const isAtLastSlide = React.useMemo(
    () => carouselState?.currentSlide === (carouselState?.totalSlides ?? 0) - 1,
    [carouselState?.currentSlide, carouselState?.totalSlides]
  );

  const goToSlide = React.useCallback(
    (slideIndex: number) => {
      if (typeof slideIndex !== 'number')
        throw new Error(
          `Wrong type for slideIndex. Expected 'number', got '${typeof slideIndex}'.`
        );

      if (carouselState?.totalSlides && slideIndex >= carouselState.totalSlides)
        throw new Error(
          `Cannot set currentSlide to ${slideIndex} as the Carousel has just ${carouselState.totalSlides} slides.`
        );

      dispatch({ type: Action.GO_TO_SLIDE, payload: slideIndex });
    },
    [carouselState?.totalSlides]
  );

  const playCarousel = React.useCallback(() => {
    if (carouselState.direction === 'forward')
      dispatch({ type: Action.NEXT_SLIDE });
    else if (carouselState.direction === 'backward')
      dispatch({ type: Action.PREVIOUS_SLIDE });
  }, [carouselState]);

  React.useEffect(() => {
    if (!carouselState.isPlaying) return;

    const slideIntervalId = setInterval(
      playCarousel,
      carouselState.slideInterval
    );

    return () => clearInterval(slideIntervalId);
  }, [
    carouselState.direction,
    carouselState.isPlaying,
    carouselState.slideInterval,
    playCarousel,
  ]);

  const setInitialValues = React.useCallback(() => {
    const carouselContainerEl = carouselState?.carouselContainerRef ?? null;

    if (
      firstSlideDOMRect &&
      firstSlideDOMRect?.width &&
      firstSlideDOMRect?.height &&
      carouselContainerEl &&
      carouselContainerEl?.current
    ) {
      dispatch({
        type: Action.UPDATE_SLIDE_WIDTH,
        payload: firstSlideDOMRect.width,
      });
      dispatch({
        type: Action.UPDATE_SLIDE_HEIGHT,
        payload: firstSlideDOMRect.height,
      });
      dispatch({
        type: Action.UPDATE_VISIBLE_SLIDES,
        payload: Math.round(
          carouselContainerEl.current.clientWidth / firstSlideDOMRect.width
        ),
      });
      dispatch({
        type: Action.GO_TO_SLIDE,
        payload: carouselState.currentSlide,
      });
    }
  }, [
    carouselState?.carouselContainerRef,
    carouselState.currentSlide,
    firstSlideDOMRect,
  ]);

  React.useEffect(() => {
    window.addEventListener('resize', setInitialValues);

    return () => {
      window.removeEventListener('resize', setInitialValues);
    };
  }, [
    carouselState.carouselContainerRef,
    firstSlideDOMRect,
    firstSlideDOMRect?.height,
    firstSlideDOMRect?.width,
    setInitialValues,
  ]);

  React.useEffect(() => {
    if (!carouselState?.slideWidth) setInitialValues();
  }, [carouselState?.slideWidth, setInitialValues]);

  return {
    carouselState,
    helpers: { goToSlide, isAtFirstSlide, isAtLastSlide },
  } as const;
}

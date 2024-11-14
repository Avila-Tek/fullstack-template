import React from 'react';

const defaultRatingPrecision = 2;

type NumericRatingPosition = 'start' | 'end';
type RatingProps = {
  rating: number;
  showNumericRating?: boolean;
  numericRatingPosition?: NumericRatingPosition;
  ratingPrecision?: number;
} & React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

export function Rating({
  children,
  rating,
  showNumericRating,
  numericRatingPosition = 'start',
  ratingPrecision = defaultRatingPrecision,
  ...rest
}: RatingProps) {
  return (
    <div {...rest}>
      {showNumericRating && rating ? (
        <span
          className={
            numericRatingPosition === 'start' ? 'order-none' : 'order-1'
          }
        >
          {rating.toPrecision(ratingPrecision)}
        </span>
      ) : null}
      {children}
    </div>
  );
}

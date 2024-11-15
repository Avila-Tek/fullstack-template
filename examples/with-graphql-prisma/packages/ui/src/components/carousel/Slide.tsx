import React from 'react';

type SlideProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

export function Slide({ children, ...rest }: SlideProps) {
  return <div {...rest}>{children}</div>;
}

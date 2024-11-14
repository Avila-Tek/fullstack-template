import React from 'react';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const textVariants = cva('text-primary-900', {
  variants: {
    fontFamily: {
      display: 'font-display',
      text: 'font-text',
    },

    // In the Designs only the following font weights are used (regular, medium, semibold, bold)
    fontWeight: {
      thin: 'font-thin',
      extraLight: 'font-extralight',
      light: 'font-light',
      regular: 'font-normal',
      medium: 'font-medium',
      semiBold: 'font-semibold',
      bold: 'font-bold',
      extraBold: 'font-extrabold',
      black: 'font-black',
    },

    // The fontSize variables are not defined here because they depend on the font family,
    // and the sizes are defined in the compoundVariants.
    fontSize: {
      xs: '',
      sm: '',
      md: '',
      lg: '',
      xl: '',
      '2xl': '',
    },
  },
  compoundVariants: [
    // Font Sizes if the font family is display
    { fontFamily: 'display', fontSize: 'xs', class: 'text-2xl' },
    { fontFamily: 'display', fontSize: 'sm', class: 'text-3xl' },
    { fontFamily: 'display', fontSize: 'md', class: 'text-4xl' },
    { fontFamily: 'display', fontSize: 'lg', class: 'text-5xl' },
    { fontFamily: 'display', fontSize: 'xl', class: 'text-6xl' },
    { fontFamily: 'display', fontSize: '2xl', class: 'text-7xl' },

    // Font Sizes if the font family is text
    { fontFamily: 'text', fontSize: 'xs', class: 'text-xs	' },
    { fontFamily: 'text', fontSize: 'sm', class: 'text-sm	' },
    { fontFamily: 'text', fontSize: 'md', class: 'text-base' },
    { fontFamily: 'text', fontSize: 'lg', class: 'text-lg' },
    { fontFamily: 'text', fontSize: 'xl', class: 'text-xl' },
    { fontFamily: 'text', fontSize: '2xl', class: 'text-2xl' },
  ],
  defaultVariants: {
    fontFamily: 'text',
    fontWeight: 'regular',
    fontSize: 'md',
  },
});

export type TextVariantsProps = VariantProps<typeof textVariants>;

export type TextVariantsFontFamily = TextVariantsProps['fontFamily'];
export type TextVariantsFontSize = TextVariantsProps['fontSize'];
export type TextVariantsFontWeight = TextVariantsProps['fontWeight'];

// If you don't want to limit the HTML tags, you can replace AllowedTags with React.ElementType
export type TextVariantsAllowedTags =
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'span';

export interface TextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  as?: TextVariantsAllowedTags;
}

function Text({
  as: Component = 'p',
  children,
  className,
  fontFamily,
  fontWeight,
  fontSize,
  ...props
}: TextProps) {
  return (
    <Component
      className={cn(
        textVariants({ fontFamily, fontWeight, fontSize, className })
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Text;

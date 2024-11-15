import React from 'react';

interface IconProps extends React.ComponentProps<'button'> {
  icon: React.ReactNode;
  onClickAction?: () => void;
}
export function Icon({ icon, onClickAction, ...props }: IconProps) {
  return (
    <button type="button" {...props} onClick={onClickAction}>
      {icon}
    </button>
  );
}

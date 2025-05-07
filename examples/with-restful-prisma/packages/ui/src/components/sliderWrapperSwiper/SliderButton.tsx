import React from 'react';
import { ArrowIcon } from '../../icons';

interface SliderButtonProps {
  icon?: React.ReactNode;
  handleClick: () => void;
  position: 'left' | 'right';
}

function SliderButton({ icon, handleClick, position }: SliderButtonProps) {
  return (
    <button className="w-5" onClick={handleClick} type="button">
      {icon || (
        <ArrowIcon
          className={`w-5 h-5 text-wine-400 ${
            position === 'left' ? 'transform rotate-180' : ''
          }`}
        />
      )}
    </button>
  );
}

export default SliderButton;

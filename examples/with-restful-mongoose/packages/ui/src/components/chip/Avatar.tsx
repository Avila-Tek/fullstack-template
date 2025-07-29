import React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  letter?: string;
}

export default function Avatar({ src, alt, letter }: AvatarProps): React.ReactElement {
  const firstLetter = letter ? letter[0] : '';

  if (src) {
    return <img className="w-full h-full rounded-full" src={src} alt={alt} />;
  }

  return <span>{firstLetter}</span>;
}

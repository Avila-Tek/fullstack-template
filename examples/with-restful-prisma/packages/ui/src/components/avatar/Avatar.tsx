import React from 'react';

export interface AvatarProps {
  // Se muestran las iniciales del nombre en caso de no tener una foto de perfil.
  alt: string;
  // Que contenga una foto de perfil es opcional.
  src?: string;
  // Clases personalizadas para el texto y el color del componente.
  classNames?: {
    textColor?: string;
    bgColor?: string;
  };
}

export default function Avatar({ alt, src, classNames }: AvatarProps) {
  // Funcion para obtener las iniciales del nombre.
  const getInitials = React.useCallback((fullName: string) => {
    const nameArr = fullName.split('');
    const createInitials = nameArr.filter(function (char) {
      return /[A-Z]/.test(char);
    });
    return createInitials.join('');
  }, []);

  const initials = React.useMemo(
    () => getInitials(alt).split('', 2).join(''),
    [alt]
  );

  return (
    <div
      className={`
        rounded-full flex items-center justify-center uppercase cursor-pointer w-full h-full
        ${
          classNames?.textColor && !src ? classNames.textColor : 'text-gray-500'
        }
         ${classNames?.bgColor && !src ? classNames.bgColor : 'bg-gray-400'}
        
      `}
    >
      {src ? (
        <img
          src={src ?? './img/default_profile.jpeg'}
          alt="profile-pic"
          className="w-full h-full rounded-full object-cover"
          onError={(e) =>
            ((e.target as HTMLImageElement).src = './img/default_profile.jpeg')
          }
        />
      ) : (
        // En caso de no tener foto, se muestran las iniciales del nombre.
        <div>{initials}</div>
      )}
    </div>
  );
}

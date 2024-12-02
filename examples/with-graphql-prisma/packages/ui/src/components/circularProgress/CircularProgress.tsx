import React from 'react';

// Interfaz que define las propiedades del componente.
export interface CircularProgressProps {
  percent: number;
  // Clases personalizadas para el texto y el color del componente.
  classNames?: {
    text?: string;
    color?: string;
  };
}

export default function CircularProgress({
  percent = 0,
  classNames,
  ...props
}: CircularProgressProps) {
  // Limita el porcentaje a un valor entre 0 y 100
  const clampedPercent = Math.min(100, Math.max(0, percent));

  // Obtener el ancho del contenedor para calcular el radio dinámicamente
  const containerRef = React.useRef<HTMLDivElement>(null);
  const containerWidth = containerRef.current?.offsetWidth || 100; // Valor predeterminado si no se puede obtener el ancho

  const radius = (containerWidth - 16) / 2; // Ajuste para el ancho de la línea del círculo
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - clampedPercent) / 100) * circumference;

  const [offset, setOffset] = React.useState(circumference);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prevOffset) => {
        const newOffset = prevOffset - 1;
        return newOffset < progress ? progress : newOffset;
      });
    }, 10);

    return () => {
      clearInterval(interval);
    };
  }, [progress]);

  return (
    <div ref={containerRef} className="h-full w-full relative min-w-[40px] ">
      <svg className="h-full w-full -rotate-90">
        {/* Círculo completo en gris */}
        <circle
          className="stroke-current text-gray-200 "
          strokeWidth="10"
          fill="transparent"
          r={radius}
          cx="50%"
          cy="50%"
        />
        {/* Círculo en color que se superpone y muestra la parte completada */}
        <circle
          className={`${classNames?.color} stroke-current transition-transform transform-gpu ease-in-out duration-300 `}
          {...props}
          strokeWidth="10"
          fill="transparent"
          r={radius}
          cx="50%"
          cy="50%"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transformOrigin: 'center',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${classNames?.text} text-lg `}>
          {Math.round(clampedPercent)} %
        </span>
      </div>
    </div>
  );
}

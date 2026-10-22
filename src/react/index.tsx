import { type ReactElement, useEffect, useRef } from 'react';

import { Tadabut as Core, type TadabutOptions } from '../index';

export type TadabutProps = TadabutOptions;

export function Tadabut({ data, columns }: TadabutProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const table = new Core(container, { data, columns });

    return () => {
      table.destroy();
    };
  }, [data, columns]);

  return <div ref={containerRef} />;
}

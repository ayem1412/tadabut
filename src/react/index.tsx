import { type ReactElement, useEffect, useRef } from 'react';

import { Tadabut as Core } from '../index';

export type TadabutProps = {
  data: Record<string, unknown>[];
  columns: { title: string; prop: string }[];
};

export function Tadabut({ data, columns }: TadabutProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const table = new Core(container, data, columns);

    return () => {
      table.destroy();
    };
  }, [data, columns]);

  return <div ref={containerRef} />;
}

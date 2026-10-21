import { type ReactElement, useEffect, useRef } from 'react';

import { Tadabut } from '../index';

export type TadabutTableProps = {
  data: Record<string, unknown>[];
  columns: { title: string; prop: string }[];
};

export function TadabutTable({ data, columns }: TadabutTableProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const table = new Tadabut(container, data, columns);

    return () => {
      table.destroy();
    };
  }, [data, columns]);

  return <div ref={containerRef} />;
}

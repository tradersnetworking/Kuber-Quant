import * as React from "react";
import { cn } from "@/lib/utils";
import { MobileDataCard, MobileDataRow } from "@/components/ui/mobile-data-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Split mobile cards (stacked) vs desktop table. */
export function ResponsiveTableShell({
  mobile,
  desktop,
  className,
}: {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="md:hidden space-y-2.5 min-w-0">{mobile}</div>
      <div className="hidden md:block min-w-0">{desktop}</div>
    </div>
  );
}

export type ResponsiveColumn<T> = {
  key: string;
  header: React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  mobileLabel?: React.ReactNode;
  hideOnMobile?: boolean;
  /** Primary line on mobile card */
  mobileTitle?: boolean;
  cell: (row: T, index: number) => React.ReactNode;
};

type ResponsiveDataViewProps<T> = {
  columns: ResponsiveColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  mobileHeader?: (row: T, index: number) => React.ReactNode;
  mobileFooter?: (row: T, index: number) => React.ReactNode;
  rowClassName?: string;
  className?: string;
  /** Accessible table caption (sr-only on desktop). */
  caption?: string;
};

export function ResponsiveDataView<T>({
  columns,
  data,
  rowKey,
  empty,
  onRowClick,
  mobileHeader,
  mobileFooter,
  rowClassName,
  className,
  caption,
}: ResponsiveDataViewProps<T>) {
  if (!data.length) {
    return empty ? <>{empty}</> : null;
  }

  const titleColumn =
    columns.find(c => c.mobileTitle) ?? columns.find(c => !c.hideOnMobile) ?? columns[0];
  const mobileColumns = columns.filter(
    c => !c.hideOnMobile && c.key !== titleColumn?.key,
  );

  return (
    <ResponsiveTableShell
      className={className}
      mobile={
        <>
          {data.map((row, index) => (
            <MobileDataCard
              key={rowKey(row)}
              className={cn(onRowClick && "cursor-pointer active:bg-muted/60", rowClassName)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {mobileHeader ? (
                mobileHeader(row, index)
              ) : titleColumn ? (
                <div className="mb-2 min-w-0 font-semibold text-sm break-words">
                  {titleColumn.cell(row, index)}
                </div>
              ) : null}
              <div className="space-y-1.5">
                {mobileColumns.map(col => (
                  <MobileDataRow
                    key={col.key}
                    label={col.mobileLabel ?? col.header}
                    value={col.cell(row, index)}
                  />
                ))}
              </div>
              {mobileFooter?.(row, index)}
            </MobileDataCard>
          ))}
        </>
      }
      desktop={
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead key={col.key} className={col.headerClassName}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow
                key={rowKey(row)}
                className={cn(onRowClick && "cursor-pointer", rowClassName)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map(col => (
                  <TableCell key={col.key} className={col.cellClassName}>
                    {col.cell(row, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    />
  );
}

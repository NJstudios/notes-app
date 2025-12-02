// components/blocks/TableBlockBody.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Block } from "@/lib/api";

type TableData = {
  columns: string[];
  rows: string[][];
};

type Props = {
  block: Block;
  onChange: (data: any) => void;
};

export function TableBlockBody({ block, onChange }: Props) {
  const table: TableData = {
    columns: Array.isArray(block.data?.columns)
      ? block.data.columns
      : ["Column 1", "Column 2"],
    rows: Array.isArray(block.data?.rows) ? block.data.rows : [],
  };

  const updateTable = (next: TableData) => {
    onChange({
      ...block.data,
      ...next,
    });
  };

  const updateHeader = (index: number, value: string) => {
    const nextCols = [...table.columns];
    nextCols[index] = value;
    updateTable({ ...table, columns: nextCols });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = table.rows.map((row, i) =>
      i === rowIndex
        ? row.map((cell, j) => (j === colIndex ? value : cell))
        : row
    );
    updateTable({ ...table, rows: nextRows });
  };

  const addRow = () => {
    const newRow = table.columns.map(() => "");
    updateTable({
      ...table,
      rows: [...table.rows, newRow],
    });
  };

  const addColumn = () => {
    const nextCols = [
      ...table.columns,
      `Column ${table.columns.length + 1}`,
    ];
    const nextRows = table.rows.map((row) => [...row, ""]);
    updateTable({ columns: nextCols, rows: nextRows });
  };

  const deleteRow = (rowIndex: number) => {
    updateTable({
      ...table,
      rows: table.rows.filter((_, i) => i !== rowIndex),
    });
  };

  const deleteColumn = (colIndex: number) => {
    if (table.columns.length <= 1) return; // keep at least one column
    const nextCols = table.columns.filter((_, i) => i !== colIndex);
    const nextRows = table.rows.map((row) =>
      row.filter((_, i) => i !== colIndex)
    );
    updateTable({
      columns: nextCols,
      rows: nextRows,
    });
  };

  return (
    <>
      <div className="inline-block min-w-full border rounded-md overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              {table.columns.map((col, colIdx) => (
                <th key={colIdx} className="border px-2 py-1 font-medium">
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-8 text-xs"
                      value={col}
                      onChange={(e) => updateHeader(colIdx, e.target.value)}
                    />
                    {table.columns.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-xs"
                        onClick={() => deleteColumn(colIdx)}
                        title="Delete column"
                      >
                        −
                      </Button>
                    )}
                  </div>
                </th>
              ))}
              {/* Extra header cell for row actions */}
              <th className="border px-2 py-1 w-10 text-xs text-muted-foreground">
                Row
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {table.columns.map((_, colIdx) => (
                  <td key={colIdx} className="border px-2 py-1">
                    <Input
                      className="h-8 text-xs"
                      value={row[colIdx] ?? ""}
                      onChange={(e) =>
                        updateCell(rowIdx, colIdx, e.target.value)
                      }
                    />
                  </td>
                ))}
                <td className="border px-2 py-1 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-xs"
                    onClick={() => deleteRow(rowIdx)}
                    title="Delete row"
                  >
                    −
                  </Button>
                </td>
              </tr>
            ))}
            {table.rows.length === 0 && (
              <tr>
                <td
                  colSpan={table.columns.length + 1}
                  className="border px-2 py-4 text-center text-muted-foreground"
                >
                  No rows yet. Use &quot;+ Row&quot; to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={addColumn}>
          + Column
        </Button>
        <Button variant="outline" size="sm" onClick={addRow}>
          + Row
        </Button>
      </div>
    </>
  );
}

// components/blocks/BlockCard.tsx
"use client";

import * as React from "react";
import type { Block } from "@/lib/api";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { TextBlockBody } from "./TextBlockBody";
import { TodoBlockBody } from "./TodoBlockBody";
import { TableBlockBody } from "./TableBlockBody";

type Props = {
  block: Block;
  onChange: (data: any) => void;
  onDelete: () => void;
};

type BlockSize = "full" | "half";

function BlockHeader(props: {
  label: string;
  title: string;
  collapsed: boolean;
  size: BlockSize;
  onToggleCollapsed: () => void;
  onSetSize: (size: BlockSize) => void;
  onDelete: () => void;
  onTitleChange: (title: string) => void;
}) {
  const {
    label,
    title,
    collapsed,
    size,
    onToggleCollapsed,
    onSetSize,
    onDelete,
    onTitleChange,
  } = props;

  return (
    <CardHeader className="flex flex-row items-center justify-between gap-2 py-2">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Input
          className="h-8 text-sm truncate"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Block title"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Width toggle */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Width:</span>
          <Button
            variant={size === "full" ? "default" : "outline"}
            size="sm"
            onClick={() => onSetSize("full")}
          >
            Full
          </Button>
          <Button
            variant={size === "half" ? "default" : "outline"}
            size="sm"
            onClick={() => onSetSize("half")}
          >
            Half
          </Button>
        </div>

        {/* Collapse + delete */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand block" : "Collapse block"}
          >
            {collapsed ? "▾" : "▴"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Delete block"
          >
            ✕
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}

export function BlockCard({ block, onChange, onDelete }: Props) {
  const collapsed = !!block.data?.collapsed;
  const size: BlockSize = block.data?.layout?.size ?? "full";

  const fallbackLabel =
    block.type === "text"
      ? "Text"
      : block.type === "todo"
      ? "Todo list"
      : block.type === "table"
      ? "Table"
      : block.type === "calendar"
      ? "Calendar"
      : "Block";

  const title = block.data?.title ?? fallbackLabel;

  const setCollapsed = (value: boolean) => {
    onChange({
      ...block.data,
      collapsed: value,
    });
  };

  const setSize = (newSize: BlockSize) => {
    onChange({
      ...block.data,
      layout: {
        ...(block.data?.layout ?? {}),
        size: newSize,
      },
    });
  };

  const setTitle = (newTitle: string) => {
    onChange({
      ...block.data,
      title: newTitle,
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <BlockHeader
        label={fallbackLabel}
        title={title}
        collapsed={collapsed}
        size={size}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
        onSetSize={setSize}
        onDelete={onDelete}
        onTitleChange={setTitle}
      />

      {!collapsed && (
        <CardContent className="pt-2">
          {block.type === "text" && (
            <TextBlockBody block={block} onChange={onChange} />
          )}

          {block.type === "todo" && (
            <TodoBlockBody block={block} onChange={onChange} />
          )}

          {block.type === "table" && (
            <TableBlockBody block={block} onChange={onChange} />
          )}

          {/* You can add a calendar body later */}
        </CardContent>
      )}
    </Card>
  );
}

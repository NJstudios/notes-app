// components/blocks/TextBlockBody.tsx
"use client";

import { Textarea } from "@/components/ui/textarea";
import type { Block } from "@/lib/api";

type Props = {
  block: Block;
  onChange: (data: any) => void;
};

export function TextBlockBody({ block, onChange }: Props) {
  return (
    <Textarea
      value={block.data?.text ?? ""}
      onChange={(e) =>
        onChange({
          ...block.data,
          text: e.target.value,
        })
      }
      className="min-h-[140px] resize-y"
    />
  );
}

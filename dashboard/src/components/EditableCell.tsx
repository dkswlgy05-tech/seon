"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type Props = {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  type?: "text" | "textarea" | "list";
  options?: string[];
  className?: string;
};

export function EditableCell({
  value,
  onCommit,
  placeholder = "—",
  type = "text",
  options,
  className,
}: Props) {
  const [local, setLocal] = useState(value);
  const listId = useRef(`opts-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => setLocal(value), [value]);

  function commit() {
    if (local !== value) onCommit(local);
  }

  if (type === "textarea") {
    return (
      <textarea
        className={clsx(
          "cell-input min-h-[2rem] resize-none leading-snug",
          !local && "is-empty",
          className
        )}
        value={local}
        placeholder={placeholder}
        rows={2}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
      />
    );
  }

  return (
    <>
      <input
        className={clsx("cell-input", !local && "is-empty", className)}
        value={local}
        list={type === "list" ? listId.current : undefined}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setLocal(value);
            e.currentTarget.blur();
          }
        }}
      />
      {type === "list" && options && (
        <datalist id={listId.current}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </>
  );
}

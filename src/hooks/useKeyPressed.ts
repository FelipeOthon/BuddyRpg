"use client";

import { useEffect, useState } from "react";

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

export function useKeyPressed(targetKey: string): boolean {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableElement(e.target)) return;
      if (e.key === targetKey) {
        if (targetKey === " ") {
          e.preventDefault();
        }
        setPressed(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === targetKey) {
        setPressed(false);
      }
    };

    const onBlur = () => setPressed(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [targetKey]);

  return pressed;
}

"use client";

import { useEffect, useRef } from "react";

const IDLE_MS = 800;

// Toggles an "is-scrolling" class on the element while it's actively being
// scrolled, then removes it after a short idle period -- pairs with the
// `scroll-fade` CSS utility to make the scrollbar thumb appear only while
// scrolling (or on hover), instead of sitting permanently visible.
export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout>;
    function handleScroll() {
      el!.classList.add("is-scrolling");
      clearTimeout(timeout);
      timeout = setTimeout(() => el!.classList.remove("is-scrolling"), IDLE_MS);
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, []);

  return ref;
}

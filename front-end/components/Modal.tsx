"use client";
import { useEffect, useRef, type ReactNode } from "react";

export default function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialog} aria-label={title} className="oracle-dialog" onCancel={event => {
    event.preventDefault(); onClose();
  }}>
    <button type="button" onClick={onClose} aria-label="Хаах" className="modal-close">×</button>
    {children}
  </dialog>;
}

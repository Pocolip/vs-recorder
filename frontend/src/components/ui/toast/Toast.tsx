import { useState, useEffect } from "react";
import { Info, X } from "lucide-react";

interface ToastProps {
  message: string;
  duration?: number;
  onDismiss: () => void;
}

export default function Toast({ message, duration = 5000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in on next frame
    const showTimer = requestAnimationFrame(() => setVisible(true));

    const hideTimer = setTimeout(() => {
      setVisible(false);
      // Wait for fade-out transition before unmounting
      setTimeout(onDismiss, 300);
    }, duration);

    return () => {
      cancelAnimationFrame(showTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-lg transition-all duration-300 dark:border-blue-500/30 dark:bg-slate-800 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />
      <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onDismiss, 300);
        }}
        className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

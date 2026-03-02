import React, { useState, useRef, useCallback, useEffect } from "react";

type Position = "top" | "bottom" | "left" | "right";

interface PopoverProps {
  position?: Position;
  trigger: React.ReactNode;
  children: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({
  position = "top",
  trigger,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const positionClasses: Record<Position, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      ref={popoverRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {trigger}
      {isOpen && (
        <div
          className={`absolute z-50 w-max rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark ${positionClasses[position]}`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default Popover;

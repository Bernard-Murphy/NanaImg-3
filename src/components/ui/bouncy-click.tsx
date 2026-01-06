import { useState } from "react";
// import "./AnimatedButton.css";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const BouncyClick = ({
  children,
  className,
  noRipple,
  ...props
}: {
  noRipple?: boolean;
  children: React.ReactNode;
  className?: string;
  props?: React.HTMLAttributes<HTMLDivElement>;
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([] as Ripple[]);
  const [pressing, setPressing] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setPressing(true);
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rippleId = Date.now();
    if (!noRipple) {
      setRipples((prev) => [...prev, { id: rippleId, x, y }]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) =>
          prev.filter((ripple: Ripple) => ripple.id !== rippleId)
        );
      }, 600);
    }

    setTimeout(() => {
      setPressing(false);
    }, 150);
  };

  return (
    <div
      className={`relative overflow-hidden duration-200 transition-all cursor-pointer ${
        pressing ? "scale-95" : ""
      } ${className || ""}`}
      onClick={handleClick}
      {...props}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="ripple"
          style={{
            left: ripple.x + "px",
            top: ripple.y + "px",
          }}
        />
      ))}
    </div>
  );
};

export default BouncyClick;

import React from "react";

const getSize = (size: string) => {
  switch (size) {
    case "sm":
      return "1rem";
    case "md":
      return "2rem";
    case "lg":
      return "3rem";
    case "xl":
      return "4rem";
    default:
      return "2rem";
  }
};

interface SpinnerProps {
  size?: string;
  color?: string;
  multiColor?: boolean;
  className?: string;
}

/**
 *
 * @param {Object} props - React props object
 *
 * Can pass the following optional props:
 * size - "sm" | "md" | "lg" | "xl" - default "md"
 * color - String, any mdb css global color variable - default "#fff"
 * multiColor - Boolean. If true, the spinner will change colors every spin.
 *
 * @returns A loading spinner
 */
const Spinner = ({
  size = "md",
  color,
  multiColor,
  className,
}: SpinnerProps) => (
  <svg
    className={`${className || ""}`}
    width={getSize(size)}
    height={getSize(size)}
    viewBox="0 0 66 66"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g>
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 33 33;270 33 33"
        begin="0s"
        dur="1.4s"
        fill="freeze"
        repeatCount="indefinite"
      />
      <circle
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        cx="33"
        cy="33"
        r="30"
        strokeDasharray="187"
        strokeDashoffset="610"
      >
        <animate
          attributeName="stroke"
          values={
            multiColor
              ? "#4285F4;#DE3E35;#F7C223;#1B9A59;#4285F4"
              : color
              ? getComputedStyle(document.body).getPropertyValue(
                  `--mdb-${color}`
                )
              : "#fff"
          }
          begin="0s"
          dur="5.6s"
          fill="freeze"
          repeatCount="indefinite"
        />
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 33 33;135 33 33;450 33 33"
          begin="0s"
          dur="1.4s"
          fill="freeze"
          repeatCount="indefinite"
        />
        <animate
          attributeName="stroke-dashoffset"
          values="187;46.75;187"
          begin="0s"
          dur="1.4s"
          fill="freeze"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  </svg>
);

export default Spinner;

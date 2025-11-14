import React from "react";

type SpinnerProps = {
  size?: number;
  className?: string;
};

const Spinner = ({ size = 32, className = "" }: SpinnerProps) => (
  <span
    className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    style={{ width: size, height: size }}
    aria-hidden="true"
  />
);

export default Spinner;

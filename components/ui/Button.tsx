import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonTone = "primary" | "secondary" | "quiet";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  icon?: ReactNode;
}

export function Button({
  tone = "secondary",
  icon,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`tc-button tc-button--${tone} ${className}`.trim()}
      {...props}
    >
      {icon ? <span className="tc-button__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}


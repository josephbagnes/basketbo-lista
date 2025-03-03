import React from "react";

export function Button({ children, className = "", variant = "default", ...props }) {
  const variantClasses = {
    default: "bg-blue-500 text-white",
    secondary: "bg-green-700 text-white",
    outline: "bg-gray-400 text-gray-700",
    ghost: "bg-transparent text-gray-700",
  };

  return React.createElement(
    "button",
    {
      className: `bg-blue-500 text-sm text-white px-4 py-2 rounded-2xl ${variantClasses[variant]} ${className}`,
      ...props,
    },
    children
  );
}

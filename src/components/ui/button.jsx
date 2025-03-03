import React from "react";

export function Button({ children, className = "", ...props }) {
  return React.createElement(
    "button",
    {
      className: `bg-blue-500 text-white px-4 py-2 rounded-2xl ${className}`,
      ...props,
    },
    children
  );
}

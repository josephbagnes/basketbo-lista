import React from "react";

export function Card({ children, className = "" }) {
  return React.createElement(
    "div",
    { className: `bg-white shadow-md rounded-2xl p-4 ${className}` },
    children
  );
}

export function CardContent({ children, className = "" }) {
  return React.createElement("div", { className: `p-2 ${className}` }, children);
}

import React from "react";

export function Input({ className = "", ...props }) {
  return React.createElement("input", {
    className: `border p-2 rounded-2xl ${className}`,
    ...props,
  });
}

import React from "react";

export function Input({ className = "", type = "text", checked, label, ...props }) {

  if (type === "checkbox") {
    return React.createElement(
      "div", 
      { className: className }, 
      React.createElement(
        "label", 
        { className: "inline-flex items-center" },
        React.createElement("input", {
          className: "border p-2 rounded-2xl mr-2",
          type: "checkbox",
          checked: checked,
          ...props
        }),
        label
      )
    );
  }

  return React.createElement("input", {
    className: `border p-2 rounded-2xl ${className}`,
    type: type,
    ...props,
  });
}

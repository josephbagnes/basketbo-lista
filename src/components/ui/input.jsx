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
          className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2",
          type: "checkbox",
          checked: checked,
          ...props
        }),
        React.createElement("span", { className: "text-sm text-gray-700" }, label)
      )
    );
  }

  const baseClasses = "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200";

  return React.createElement("input", {
    className: `${baseClasses} ${className}`,
    type: type,
    ...props,
  });
}

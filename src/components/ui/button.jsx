import React from "react";

export function Button({ children, className = "", variant = "default", size = "md", disabled = false, ...props }) {
  const baseClasses = "inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border border-transparent",
    secondary: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 border border-transparent",
    outline: "bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500 border border-gray-300",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 border border-transparent",
    google: "bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 border border-gray-300 shadow-sm",
  };

  const sizeClasses = {
    xs: "px-2 py-1 text-xs rounded",
    sm: "px-3 py-1.5 text-sm rounded-md",
    md: "px-4 py-2 text-sm rounded-md",
    lg: "px-6 py-3 text-base rounded-lg",
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return React.createElement(
    "button",
    {
      className: combinedClasses,
      disabled,
      ...props,
    },
    children
  );
}

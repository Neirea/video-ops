"use client";
import React, { type ButtonHTMLAttributes } from "react";

const ControlButton = ({
    children,
    ...attributes
}: React.PropsWithChildren<ButtonHTMLAttributes<object>>) => {
    return (
        <button
            className="h-8 w-8 cursor-pointer border-none bg-none p-0 text-lg opacity-[85%] transition-opacity hover:opacity-100 disabled:opacity-50"
            {...attributes}
        >
            {children}
        </button>
    );
};

export default ControlButton;

"use client";
import React, { type ButtonHTMLAttributes } from "react";

const ControlButton = ({
    children,
    ...attributes
}: React.PropsWithChildren<ButtonHTMLAttributes<object>>) => {
    return (
        <button
            className="bg-none border-none p-0 h-8 w-8 text-lg cursor-pointer opacity-[85%] hover:opacity-100 transition-opacity disabled:opacity-50"
            {...attributes}
        >
            {children}
        </button>
    );
};

export default ControlButton;

import React from "react";

const HeadingOne = ({ children }: React.PropsWithChildren) => {
    return (
        <h1 className="m-0 text-center text-4xl font-bold whitespace-pre-wrap text-violet-500">
            {children}
        </h1>
    );
};

export default HeadingOne;

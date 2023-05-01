import React from "react";

const HeadingOne = ({ children }: React.PropsWithChildren) => {
    return (
        <h1 className="text-center text-violet-500 text-4xl font-bold m-0 whitespace-pre-wrap">
            {children}
        </h1>
    );
};

export default HeadingOne;

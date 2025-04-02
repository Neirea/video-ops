import React from "react";

const HeadingTwo = ({ children }: React.PropsWithChildren) => {
    return (
        <h2 className="my-4 text-center text-3xl font-bold text-violet-500">
            {children}
        </h2>
    );
};

export default HeadingTwo;

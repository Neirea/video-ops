import React from "react";

const HeadingTwo = ({ children }: React.PropsWithChildren) => {
    return (
        <h2 className="text-center text-purple-500 font-bold text-3xl my-4">
            {children}
        </h2>
    );
};

export default HeadingTwo;

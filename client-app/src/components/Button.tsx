interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {}

const Button = ({ children, ...attributes }: ButtonProps) => {
    return (
        <button
            className="block leading-normal border-solid border-2 border-white rounded px-2 py-1 text-xl cursor-pointer disabled:border-stone-500 disabled:text-stone-500 disabled:cursor-not-allowed [&:not(:disabled)]:hover:bg-zinc-800"
            {...attributes}
        >
            {children}
        </button>
    );
};

export default Button;

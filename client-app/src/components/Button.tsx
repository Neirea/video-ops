type ButtonProps = React.ComponentPropsWithoutRef<"button">;

const Button = ({ children, ...attributes }: ButtonProps) => {
    return (
        <button
            className="block cursor-pointer rounded-sm border-2 border-solid border-white px-2 py-1 text-xl leading-normal not-disabled:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:border-stone-500 disabled:text-stone-500"
            {...attributes}
        >
            {children}
        </button>
    );
};

export default Button;

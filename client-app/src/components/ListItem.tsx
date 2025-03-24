type ListProps = React.ComponentPropsWithoutRef<"li">;

const ListItem = ({ children, ...attributes }: ListProps) => {
    return (
        <li className="py-1 px-2 cursor-pointer" {...attributes}>
            {children}
        </li>
    );
};

export default ListItem;

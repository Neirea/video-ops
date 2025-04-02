type ListProps = React.ComponentPropsWithoutRef<"li">;

const ListItem = ({ children, ...attributes }: ListProps) => {
    return (
        <li className="cursor-pointer px-2 py-1" {...attributes}>
            {children}
        </li>
    );
};

export default ListItem;

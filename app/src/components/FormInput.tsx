import { ChangeEvent, useId } from "react";

type FormInputProps = {
    value: string;
    handleInput: (e: ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
};

const FormInput = ({
    value,
    handleInput,
    disabled,
    children,
}: React.PropsWithChildren<FormInputProps>) => {
    const id = useId();
    return (
        <div className="flex flex-col items-center gap-2">
            <label htmlFor={id}>{children}</label>
            <input
                id={id}
                className="h-6 w-60 text-xl text-black"
                value={value}
                onChange={handleInput}
                disabled={disabled}
            />
        </div>
    );
};

export default FormInput;

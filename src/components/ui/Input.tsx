import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, id, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-2 w-full">
                {label && (
                    <label htmlFor={id} className="text-sm font-medium text-[var(--muted-foreground)]">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={id}
                    className={`input ${error ? 'border-[var(--destructive)]' : ''} ${className}`}
                    {...props}
                />
                {error && (
                    <span className="text-xs text-[var(--destructive)]">{error}</span>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

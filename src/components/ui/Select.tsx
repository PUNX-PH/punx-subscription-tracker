import { SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className = '', label, error, id, options, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-2 w-full">
                {label && (
                    <label htmlFor={id} className="text-sm font-medium text-[var(--muted-foreground)]">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={id}
                        className={`input appearance-none bg-[var(--background)] ${error ? 'border-[var(--destructive)]' : ''} ${className}`}
                        {...props}
                    >
                        <option value="" disabled>Select an option</option>
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--muted-foreground)]">
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </div>
                </div>
                {error && (
                    <span className="text-xs text-[var(--destructive)]">{error}</span>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

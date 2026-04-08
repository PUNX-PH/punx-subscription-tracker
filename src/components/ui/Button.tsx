import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'gradient';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    style?: React.CSSProperties;
}

export const Button = ({
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled,
    style,
    ...props
}: ButtonProps) => {

    // Base class
    const baseClass = "btn"; // Defined in globals.css

    // Style variants map directly to CSS classes in globals.css
    // We need to ensure globals.css has these classes
    const variantMap = {
        primary: "btn-primary",
        secondary: "btn-secondary",
        ghost: "btn-ghost",
        destructive: "btn-destructive",
        outline: "btn-outline",
        gradient: "btn-gradient",
    };

    const sizeMap = {
        sm: "btn-sm",
        md: "btn-md",
        lg: "btn-lg",
        icon: "btn-icon",
    };

    const classNames = [
        baseClass,
        variantMap[variant] || variantMap.primary,
        sizeMap[size] || sizeMap.md,
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={classNames}
            disabled={disabled || isLoading}
            style={style}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin" style={{ marginRight: '8px', height: '16px', width: '16px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {children}
        </button>
    );
};

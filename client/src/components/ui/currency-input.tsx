import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string | number;
  onChange: (value: string) => void;
  allowNegative?: boolean;
}

/**
 * Currency Input Component
 * 
 * Features:
 * - Displays formatted currency with $ and commas (e.g., $10,021,740)
 * - Allows easy copy/paste of values
 * - Removes formatting while typing for smooth input
 * - Validates and prevents negative values (unless allowNegative is true)
 * - Supports decimal values (cents)
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, allowNegative = false, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState("");

    // Format number with commas and $ sign
    const formatCurrency = (val: string | number): string => {
      if (val === "" || val === null || val === undefined) return "";
      
      const numValue = typeof val === "string" ? parseFloat(val) : val;
      if (isNaN(numValue)) return "";
      
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(numValue);
    };

    // Remove formatting for editing
    const unformatCurrency = (val: string): string => {
      return val.replace(/[$,]/g, "");
    };

    // Update display value when prop value changes
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatCurrency(value));
      }
    }, [value, isFocused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Show raw number for editing
      const rawValue = unformatCurrency(displayValue);
      setDisplayValue(rawValue);
      
      // Select all text for easy replacement
      setTimeout(() => {
        e.target.select();
      }, 0);
      
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      
      // Format the value
      const rawValue = e.target.value;
      if (rawValue) {
        const numValue = parseFloat(rawValue);
        if (!isNaN(numValue)) {
          setDisplayValue(formatCurrency(numValue));
          onChange(numValue.toString());
        } else {
          setDisplayValue("");
          onChange("");
        }
      } else {
        setDisplayValue("");
        onChange("");
      }
      
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty value
      if (inputValue === "") {
        setDisplayValue("");
        onChange("");
        return;
      }
      
      // Remove any non-numeric characters except decimal point and minus
      let cleaned = inputValue.replace(/[^0-9.-]/g, "");
      
      // Handle negative values
      if (!allowNegative && cleaned.startsWith("-")) {
        cleaned = cleaned.substring(1);
      }
      
      // Ensure only one decimal point
      const parts = cleaned.split(".");
      if (parts.length > 2) {
        cleaned = parts[0] + "." + parts.slice(1).join("");
      }
      
      // Limit decimal places to 2
      if (parts.length === 2 && parts[1].length > 2) {
        cleaned = parts[0] + "." + parts[1].substring(0, 2);
      }
      
      setDisplayValue(cleaned);
      onChange(cleaned);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      
      // Remove currency symbols and commas
      const cleaned = pastedText.replace(/[$,]/g, "");
      
      // Validate it's a number
      const numValue = parseFloat(cleaned);
      if (!isNaN(numValue)) {
        if (!allowNegative && numValue < 0) {
          setDisplayValue(Math.abs(numValue).toString());
          onChange(Math.abs(numValue).toString());
        } else {
          setDisplayValue(numValue.toString());
          onChange(numValue.toString());
        }
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        className={cn(className)}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };

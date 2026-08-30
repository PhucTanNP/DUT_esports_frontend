'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import './ui.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Input dùng chung — kèm label + error message.
 *
 * <Input label="Email" error={errors.email?.message} {...register('email')} />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, id, ...props },
  ref,
) {
  const inputId = id ?? props.name;

  return (
    <div className="field">
      {label && (
        <label htmlFor={inputId} className="field__label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn('field__input', error && 'field__input--error', className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <p className="field__error">{error}</p>}
    </div>
  );
});

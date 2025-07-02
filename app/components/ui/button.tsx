'use client';

import { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline';
};

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
  return (
    <button
className={`px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 transition ${className}`}
      {...props}
    />
  );
}

import * as React from 'react'
import { cn, inputClass } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
    <input type={type} ref={ref} className={cn(inputClass, className)} {...props} />
))
Input.displayName = 'Input'

export { Input }

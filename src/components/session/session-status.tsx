import { AlertCircle } from 'lucide-react'
import { Spinner } from '@/components/ui'

export function SessionError({ message }: { message: string }) {
    return (
        <p
            className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-8"
            role="alert"
        >
            <AlertCircle className="size-4 shrink-0" />
            {message}
        </p>
    )
}

export function KeyboardLoading() {
    return (
        <div className="flex min-h-0 flex-1 items-center justify-center">
            <Spinner label="Loading the keys…" />
        </div>
    )
}

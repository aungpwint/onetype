import { Modal } from '@/components/ui'
import { Button } from '@/components/ui/button'

export function ConfirmAbandon({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
    return (
        <Modal open={open} onClose={onClose} ariaLabel="Leave this round?">
            <h2 className="font-display text-lg">Leave this round?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
                Nothing so far in this attempt will be saved. You can pick it up again any time from the lessons list.
            </p>
            <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                    Keep typing
                </Button>
                <Button variant="destructive" onClick={onConfirm}>
                    Leave the round
                </Button>
            </div>
        </Modal>
    )
}

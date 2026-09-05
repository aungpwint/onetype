import { Hand, Volume2, VolumeX } from 'lucide-react'
import { useUiStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'

const toolActive = 'border-primary bg-primary/10 text-primary hover:border-primary hover:bg-primary/15 hover:text-primary'
const toolIdle = 'border-transparent text-muted-foreground hover:text-foreground'

export function SessionTools() {
    const handGuideVisible = useUiStore((s) => s.handGuideVisible)
    const soundEnabled = useUiStore((s) => s.soundEnabled)
    const toggleHandGuide = useUiStore((s) => s.toggleHandGuide)
    const setSoundEnabled = useUiStore((s) => s.setSoundEnabled)

    return (
        <>
            <Button
                variant="outline"
                size="icon-sm"
                aria-label={handGuideVisible ? 'Hide hand guide' : 'Show hand guide'}
                aria-pressed={handGuideVisible}
                title={handGuideVisible ? 'Hide hand guide' : 'Show hand guide'}
                className={handGuideVisible ? toolActive : toolIdle}
                onClick={toggleHandGuide}
            >
                <Hand className="size-4" />
            </Button>
            <Button
                variant="outline"
                size="icon-sm"
                aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                aria-pressed={soundEnabled}
                title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                className={soundEnabled ? toolActive : toolIdle}
                onClick={() => setSoundEnabled(!soundEnabled)}
            >
                {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </Button>
        </>
    )
}

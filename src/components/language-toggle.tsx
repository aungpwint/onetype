import { useSettingsStore } from '@/stores/settings-store'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'

export type Language = 'myanmar' | 'english'

const LANGUAGE_KEY = 'app.language' as const

interface LanguageToggleProps {
    lang?: Language
    onChange?: (lang: Language) => void
}

export function LanguageToggle({ lang, onChange }: LanguageToggleProps) {
    const stored = useSettingsStore((s) => s.get(LANGUAGE_KEY))
    const setStored = useSettingsStore((s) => s.set)

    const value = lang ?? (stored === 'myanmar' ? 'myanmar' : 'english')

    const handleChange = (next: 'myanmar' | 'english') => {
        if (onChange) {
            onChange(next)
            return
        }
        void setStored(LANGUAGE_KEY, next)
    }

    return (
        <Tabs value={value} onValueChange={(v) => handleChange(v as Language)}>
            <TabsList className="bg-muted">
                <TabsTrigger value="myanmar">
                    <span className="font-myanmar">မြန်မာ</span>
                </TabsTrigger>
                <TabsTrigger value="english">English</TabsTrigger>
            </TabsList>
        </Tabs>
    )
}

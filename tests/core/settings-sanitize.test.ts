import { describe, expect, it } from 'vitest'

import { sanitizeSettingValue, DEFAULT_SETTINGS, APP_SETTING_KEYS } from '@/stores/settings-store'

describe('setting value sanitization', () => {
    it('passes valid values through unchanged', () => {
        expect(sanitizeSettingValue('app.language', 'english')).toBe('english')
        expect(sanitizeSettingValue('practice.focusGuard', 'soft')).toBe('soft')
        expect(sanitizeSettingValue('practice.soundVolume', '0.65')).toBe('0.65')
        expect(sanitizeSettingValue('practice.time', '60')).toBe('60')
        expect(sanitizeSettingValue('dashboard.dailyGoalMinutes', '0')).toBe('0')
        expect(sanitizeSettingValue('teacher.studentCodePrefix', 'STU')).toBe('STU')
    })

    it('coerces out-of-range and malformed values to their default', () => {
        expect(sanitizeSettingValue('app.language', 'klingon')).toBe('myanmar')
        expect(sanitizeSettingValue('practice.focusGuard', 'always')).toBe('pause')
        expect(sanitizeSettingValue('practice.soundVolume', '12')).toBe('0.5')
        expect(sanitizeSettingValue('practice.soundVolume', 'not-a-number')).toBe('0.5')
        expect(sanitizeSettingValue('practice.time', '-5')).toBe('30')
        expect(sanitizeSettingValue('practice.words', '0')).toBe('25')
        expect(sanitizeSettingValue('dashboard.dailyGoalMinutes', '-1')).toBe('15')
        expect(sanitizeSettingValue('teacher.studentCodePrefix', 'not!!valid!!')).toBe('STU')
    })

    it('accepts any value placed in keys without a rule (free-form fields)', () => {
        expect(sanitizeSettingValue('notification.lastNotifiedVersion', '1.2.3')).toBe('1.2.3')
    })

    it('keeps the catalogue of keys and the rule set in lockstep', () => {
        for (const key of APP_SETTING_KEYS) {
            // A valid call should never deviate, whatever the setting type is.
            expect(sanitizeSettingValue(key, DEFAULT_SETTINGS[key])).toBe(DEFAULT_SETTINGS[key])
            expect(typeof sanitizeSettingValue(key, DEFAULT_SETTINGS[key])).toBe('string')
        }
    })
})

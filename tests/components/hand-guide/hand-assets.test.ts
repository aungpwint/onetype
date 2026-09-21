import { describe, expect, it } from 'vitest'
import { POSE_PADS, poseHand, TYPING_CLUB_VIEWBOX, typingClubHandSprite } from '@/components/hand-guide/hand-assets'
import type { Hand } from '@/types'

function groupsOf(hand: Hand): Map<string, string> {
    const matches = [...typingClubHandSprite(hand).matchAll(/<g[^>]*data-hand-pose="([^"]+)"[^>]*>/g)]
    return new Map(matches.map((m) => [m[1], m[0]]))
}

describe('typingClubHandSprite', () => {
    it('builds one mounted sprite per hand containing every pose group', () => {
        for (const hand of ['left', 'right'] as const) {
            const svg = typingClubHandSprite(hand)
            expect(svg.endsWith('</svg>\n')).toBe(true)
            expect(groupsOf(hand).size).toBeGreaterThanOrEqual(25)
        }
    })

    it('shows only the neutral pose by default, hiding the press poses', () => {
        for (const hand of ['left', 'right'] as const) {
            const groups = groupsOf(hand)
            const neutral = hand === 'left' ? 'neutral-left' : 'neutral-right'
            for (const [id, tag] of groups) {
                if (id === neutral) expect(tag.includes('display:block')).toBe(true)
                else expect(tag.includes('display:none')).toBe(true)
            }
        }
    })

    it('tags every group for reveal and keeps the st0 default-hidden class', () => {
        for (const hand of ['left', 'right'] as const) {
            for (const [id, tag] of groupsOf(hand)) {
                expect(tag).toContain('class="st0"')
                expect(tag).toContain(`id="${id}"`)
            }
        }
    })

    it('caches the built sprite so keystrokes never rebuild the artwork', () => {
        const left = typingClubHandSprite('left')
        expect(typingClubHandSprite('left')).toBe(left)
        expect(typingClubHandSprite('right')).not.toBe(left)
        expect(TYPING_CLUB_VIEWBOX).toEqual({ width: 716.3, height: 380 })
    })
})

describe('POSE_PADS', () => {
    it('resolves every pad pose to a hand and a mounted sprite group', () => {
        const groups = new Set([...groupsOf('left').keys(), ...groupsOf('right').keys()])
        const poses = Object.keys(POSE_PADS)
        expect(poses.length).toBeGreaterThan(35)
        for (const pose of poses) {
            expect(poseHand(pose)).not.toBeNull()
            expect(groups.has(pose)).toBe(true)
            expect(POSE_PADS[pose]).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }))
        }
    })

    it('keys the finger pads to the right hands (f/j on their anchors, digits split)', () => {
        expect(poseHand('f')).toBe('left')
        expect(poseHand('j')).toBe('right')
        expect(poseHand('tab')).toBe('left')
        expect(poseHand('key-5')).toBe('left')
        expect(poseHand('key-6')).toBe('right')
        expect(poseHand('space')).toBe('right')
        expect(poseHand('enter')).toBe('right')
    })
})
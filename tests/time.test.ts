import {it,expect} from 'vitest';
import {dayKey,dateShift,duration} from '../src/lib/time';
it('splits competition days exactly at Malaysia midnight',()=>{expect(dayKey('2026-09-20T15:59:59.999Z')).toBe('2026-09-20');expect(dayKey('2026-09-20T16:00:00.000Z')).toBe('2026-09-21');});
it('handles month/year boundaries and leap days',()=>{expect(dateShift('2026-01-01',-1)).toBe('2025-12-31');expect(dateShift('2024-03-01',-1)).toBe('2024-02-29');expect(duration(384)).toBe('6:24');});

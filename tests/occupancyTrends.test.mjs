import test from 'node:test';
import assert from 'node:assert/strict';
import { addOccupancyTrends } from '../src/utils/occupancyTrends.mjs';

test('uses calendar-day spacing and excludes missing days rather than treating them as zero', () => {
    const rows = [{ label: 1, current: 20, previous: 90 }, { label: 2, current: null, previous: 80 }, { label: 5, current: 60, previous: null }, { label: 7, current: 80, previous: 30 }];
    const result = addOccupancyTrends(rows);
    assert.deepEqual(result.map(row => row.current_trend), [20, null, 60, 80]);
    assert.deepEqual(result.map(row => row.previous_trend), [90, 80, null, 30]);
    assert.equal(rows[0].current_trend, undefined);
});

test('requires two observations and retains genuine zero occupancy', () => {
    const result = addOccupancyTrends([{ label: 1, current: 0, previous: null }, { label: 3, current: 20, previous: 50 }]);
    assert.deepEqual(result.map(row => row.current_trend), [0, 20]);
    assert.equal(result[1].previous_trend, undefined);
    assert.deepEqual(addOccupancyTrends([]), []);
});

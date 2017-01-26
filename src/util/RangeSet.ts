import { sortedIndex } from 'lodash';

export interface RangeItem {
    from: number;
    to: number;
    data: any;
};

/**
 * RangeSet stores sets of non-intersecting ranges along with
 * some associated data. It is then able efficiently retrieve
 * continuous intersections.
 */
export default class RangeSet {
    private boundaries: Array<number>;
    private ranges: Array<RangeItem>;

    constructor() {
        this.boundaries = [];
        this.ranges = [];
    }

    /**
     * Returns the index of the range that contains a value
     * or null if it doesnt exist
     */
    private indexOf(value: number): number | null {
        let start = 0;
        let end = this.boundaries.length-1;
        let mid;
        // binary search to find closest matches
        while(end-start > 1) {
            mid = start + Math.floor((end-start)/2);
            const midValue = this.boundaries[mid];
            if(value == midValue) {
                return Math.floor(mid/2);
            } else if(value > this.boundaries[mid]) {
                start = mid;
            } else {
                end = mid;
            }
        }
        const startRangeIdx = Math.floor(start/2);
        const endRangeIdx = Math.floor(end/2);
        if(value == this.boundaries[start]) {
            return startRangeIdx;
        } else if(value == this.boundaries[end]) {
            return endRangeIdx;
        } else if(
            value > this.boundaries[start] &&
            value < this.boundaries[end] && 
            startRangeIdx == endRangeIdx
        ) {
            return startRangeIdx;
        } else {
            return null;
        }
    }

    /**
     * Returns the range that includes given value or null if
     * it is not in the set
     */
    find(value: number): RangeItem | null {
        const index = this.indexOf(value);
        return ((index !== null) ? this.ranges[index] : null);
    }

    /**
     * Returns set of continous ranges that intersect with the given range
     */
    intersection(from: number, to: number): Array<RangeItem> {
        const fromIdx = this.indexOf(from);
        const toIdx = this.indexOf(to);
        if(fromIdx === null || toIdx === null) {
            return [];
        }
        if(fromIdx == toIdx) {
            const range = this.ranges[fromIdx];
            return [{ from, to, data: range.data }];
        } else {
            let isContinuous = true;
            for(let i = fromIdx; i < toIdx;i++) {
                if(this.ranges[i].to + 1 != this.ranges[i+1].from) {
                    isContinuous = false;
                    break;
                }
            }
            if(isContinuous) {
                const ranges = this.ranges.slice(fromIdx, toIdx + 1);
                const intersection = Array<RangeItem>();
                intersection.push({
                    from,
                    to: ranges[0].to,
                    data: ranges[0].data
                });
                for(let i = 1;i < ranges.length-1;i++) {
                    intersection.push(ranges[i]);
                }
                const lastIdx = ranges.length-1;
                intersection.push({
                    from: ranges[lastIdx].from,
                    to,
                    data: ranges[lastIdx].data
                });
                return intersection
            } else {
                return [];
            }
        }
    }

    /**
     * Adds a range to the set
     */
    addRange(from: number, to: number, data: any) {
        if(from > to) {
            throw new Error(`Invalid Range ${from}:${to}`);
        }
        const fromIdx = this.indexOf(from);
        const toIdx = this.indexOf(to);
        if(fromIdx !== null || toIdx !== null) {
            throw new Error(`Range ${from}:${to} overlaps with existing range`);
        }
        const boundaryIndex = sortedIndex(this.boundaries, from);
        const rangeIndex = Math.floor(boundaryIndex/2);
        this.boundaries.splice(boundaryIndex, 0, from, to);
        this.ranges.splice(rangeIndex, 0, { from, to, data });
    }
}
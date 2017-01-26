import * as falcor from 'falcor';
import { range } from 'lodash';

export function isKey(keySet: falcor.KeySet): keySet is falcor.Key {
    return (typeof keySet === 'number' || typeof keySet === 'string' || typeof keySet === 'boolean');
}

export function isRange(keySet: falcor.KeySet): keySet is falcor.Range {
    const range = <falcor.Range>keySet;
    return (typeof range === 'object' &&
            (range.to !== undefined || range.length !== undefined));
}

export function isNumbers(keySet: falcor.KeySet): boolean {
    return (
        typeof keySet === 'number' ||
        typeof keySet === 'string' && !isNaN(+keySet) ||
        keySet instanceof Array && keySet.every((i) => isNumbers(i)) ||
        isRange(keySet)
    );
}

export function flattenRange(rangeObj: falcor.Range): Array<number> {
    const start = rangeObj.from || 0;
    const end = rangeObj.to === undefined ? (start + rangeObj.length) : (start + rangeObj.to + 1);
    return range(start, end);
}
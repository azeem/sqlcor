import { expect } from 'chai';
import { RangeItem } from '../../src/util/RangeSet';
import RangeSet from '../../src/util/RangeSet';

describe('RangeMatcher', () => {
    let rangeMatcher;
    beforeEach(() => {
        rangeMatcher = new RangeSet();
        rangeMatcher.addRange(110, 150, 'D');
        rangeMatcher.addRange(5, 20, 'A');
        rangeMatcher.addRange(100, 109, 'C');
        rangeMatcher.addRange(56, 73, 'B');
    });

    function checkRange(args) {
        let [from, to, expectedData] = args;
    }

    describe('#find', () => {
        [
            // mid range values
            [10, 'A'],
            [101, 'C'],
            [120, 'D'],
            // boundary values
            [5, 'A'],
            [20, 'A'],
            [100, 'C'],
            [109, 'C'],
            [110, 'D'],
            [150, 'D']
        ].forEach(([value, assertion], i) => {
            it(`should match values ${i}`, () => {
                const match = rangeMatcher.find(value);
                expect(match).to.be.ok;
                expect(match.data).to.be.equal(assertion);
            });
        });
        
        [ 0, 35, 200 ].forEach((value, i) => {
            it(`should fail for out of range values ${i}`, () => {
                const match = rangeMatcher.find(value);
                expect(match).to.be.not.ok;
            });
        });
    });

    describe('#intersection', () => {
        [
            // mid range
            [7, 15, [{from: 7, to: 15, data: 'A'}]],
            [101, 105, [{from: 101, to: 105, data: 'C'}]],
            [120, 135, [{from: 120, to: 135, data: 'D'}]],
            // exact range matches
            [5, 20, [{from: 5, to: 20, data: 'A'}]],
            [56, 73, [{from: 56, to: 73, data: 'B'}]],
            [110, 150, [{from: 110, to: 150, data: 'D'}]],
            // multiple intersections
            [100, 150, [{from: 100, to: 109, data: 'C'}, {from: 110, to: 150, data: 'D'}]],
            [103, 124, [{from: 103, to: 109, data: 'C'}, {from: 110, to: 124, data: 'D'}]]
        ].forEach(([from, to, expectedResult]: [number, number, Array<RangeItem>], i) => {
            it(`should match ${i}`, () => {
                const match = rangeMatcher.intersection(from, to);
                expect(match).to.be.ok;
                expect(match).to.have.length(expectedResult.length);
                expectedResult.forEach((item, i) => {
                    expect(match[i]).to.be.eql(item);
                });
            });
        });

        [
            [0, 1],
            [0, 4],
            [151, 120],
            [200, 300]
        ].forEach(([from, to], i) => {
            it(`should fail for out of range values ${i}`, () => {
                const match = rangeMatcher.intersection(from, to);
                expect(match).to.be.ok;
                expect(match).to.have.length(0);
            });
        });
    });
});
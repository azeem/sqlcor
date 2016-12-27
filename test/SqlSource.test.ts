import { expect } from 'chai';
import { difference } from 'lodash';
import SqlSource from '../src/SqlSource';
import { Ref } from '../src/Model';
import * as falcor from 'falcor';

function PromiseAllWithError(promises) {
    return Promise.all(promises).catch((error) => {
        return new Error(error.toString());
    });
}

describe('Test', () => {
    it('should work from the client properly', () => {
        debugger;
        const testGraph = {
            foo: 12,
            bleeh: new Ref(['bar', 'someValues']),
            bar: {
                foobar: 'Hello World',
                fizzbuzz: 42,
                someValues: [
                    { value: 1 },
                    { value: 2 },
                    { value: 3 },
                    { value: 4 },
                    { value: 5 }
                ]
            }
        };
        const model = new falcor.Model({
            source: new SqlSource(testGraph)
        });

        return PromiseAllWithError([
            expect(model.get('foo.bar.foobar')).to.eventually.be.rejected,
            expect(model.get('foo.mystery')).to.eventually.be.rejected,
            expect(model.get('bar')).to.eventually.be.rejected,
            expect(model.getValue('foo')).to.eventually.be.eql(12),
            expect(model.getValue('bar.foobar')).to.eventually.be.eql('Hello World'),
            expect(model.get('foo', 'bar.foobar')).to.eventually.be.eql({
                json: {
                    foo: 12,
                    bar: {
                        foobar: 'Hello World'
                    }
                }
            }),
            expect(model.get('bleeh[1,2].value')).to.eventually.be.eql({
                json: {
                    bleeh: {
                        '1': {
                            value: 2
                        },
                        '2': {
                            value: 3
                        }
                    }
                }
            }),
            expect(model.get('bar.someValues[2...4].value')).to.eventually.be.eql({
                json: {
                    bar: {
                        someValues: {
                            '2': { value: 3 },
                            '3': { value: 4 },
                        }
                    }
                }
            }),
            expect(model.get(['bar', ['foobar', 'fizzbuzz']])).to.eventually.be.eql({
                json: {
                    bar: {
                        foobar: 'Hello World',
                        fizzbuzz: 42
                    }
                }
            }),
        ]);
    });
});

import { Observable } from 'rx';
import * as falcor from 'falcor';
import SqlcorError from './SqlcorError';
import { Graph, Ref } from './Model';
import { range, flatten, setWith } from 'lodash';

function isRange(keySet: falcor.KeySet): keySet is falcor.Range {
    const range = <falcor.Range>keySet;
    return (typeof range === 'object' &&
            (range.to !== undefined || range.length !== undefined));
}

function isDeeper(graph: any): graph is Graph | Array<Graph> {
    return (typeof graph !== 'number' && 
            typeof graph !== 'boolean' && 
            typeof graph !== 'string' && 
            graph !== null);
}

export default class SqlSource implements falcor.DataSource {
    constructor(private graph: Graph) {
        this.graph = graph;
    }

    private makeKeys(keySet: falcor.KeySet): Array<falcor.Key> {
        if(keySet instanceof Array) {
            return flatten(keySet.map((k) => this.makeKeys(k)));
        } else if(isRange(keySet)) {
            const start = keySet.from || 0;
            const end = keySet.to === undefined ? (start + keySet.length) : (start + keySet.to + 1);
            return range(start, end);
        } else {
            return [keySet];
        }
    }

    private resolvePathSet(pathSet: falcor.PathSet, 
                           graph: Graph | Array<Graph> = this.graph, 
                           curPathSet: falcor.PathSet = [], 
                           index: number = 0): Observable<falcor.PathValue> {
        if (index >= pathSet.length) {
            throw new SqlcorError(`Cannot resolve to non atomic type at path ${curPathSet}`);
        }
        const keys = this.makeKeys(pathSet[index]);
        return Observable.merge(keys.map((key) => {
            const nextPathSet = curPathSet.concat(key);
            const value = graph[key.toString()];
            if(value === undefined) {
                throw new SqlcorError(`Graph undefined at ${nextPathSet}`);
            } else if(value instanceof Ref) {
                const newPath = value.path.concat(pathSet.slice(index + 1));
                return Observable.merge([
                    Observable.from([{
                        path: nextPathSet,
                        value: value
                    }]),
                    this.resolvePathSet(newPath)
                ]);
            } else if(isDeeper(value)) {
                return this.resolvePathSet(pathSet, value, nextPathSet, index + 1);
            } else if(index !== pathSet.length - 1) {
                throw new SqlcorError(`Path ${nextPathSet} unexpectedly ended in atom`);
            } else {
                return Observable.from([{
                    path: nextPathSet,
                    value: value
                }]);
            }
        }));
    }
    
    get(pathSets: Array<falcor.PathSet>): Observable<falcor.JSONGraphEnvelope> {
        try {
            return Observable
                .merge(pathSets.map((pathSet) => {
                    return this.resolvePathSet(pathSet);
                }))
                .toArray()
                .map((pathValues) => {
                    const jsonGraph = {};
                    const pathsMap = {};
                    const paths = Array();
                    for(let pathValue of pathValues) {
                        const path= (<Array<string>>pathValue.path).join('.');
                        if(!pathsMap[path]) {
                            let value;
                            if(pathValue.value instanceof Ref) {
                                value = pathValue.value.toAtom();
                            } else {
                                value = pathValue.value;
                            }
                            setWith(jsonGraph, path, value, Object);
                            pathsMap[path] = true;
                            paths.push(path);
                        }
                    }
                    return { jsonGraph, paths };
                });
        } catch(err) {
            if(err.name === 'SqlcorError') {
                return Observable.throw<falcor.JSONGraphEnvelope>(err);
            } else {
                throw err;
            }
        }
    }

    set(jsonGraphEnvelope): Observable<falcor.JSONGraphEnvelope> {
        return Observable.from([]);
    }
    
    call(functionPath, args, refSuffixes, thisPaths): Observable<falcor.JSONGraphEnvelope> {
        return Observable.from([]);
    }
}
import { Observable } from 'rx';
import * as falcor from 'falcor';
import * as knex from 'knex';
import SqlcorError from './SqlcorError';
import { Query, Graph, Ref } from './Model';
import { flatMap, range, flatten, setWith } from 'lodash';
import { isRange } from './util';

function isDeeper(graph: any): graph is Graph | Array<Graph> {
    return (typeof graph !== 'number' && 
            typeof graph !== 'boolean' && 
            typeof graph !== 'string' && 
            graph !== null);
}

export default class SqlSource implements falcor.DataSource {
    constructor(private graph: Graph, private knex: knex) {}

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

    private resolveQuery(pathSet: falcor.PathSet,
                         curPathSet: falcor.PathSet,
                         index: number,
                         query: Query): Observable<falcor.PathValue> {

        if((index + query.filters.length) < pathSet.length) {
            throw new SqlcorError(`Path ${pathSet} should have keys for all filter values and a field`);
        }

        // fields that'll be returned from the final results
        const fields = this.makeKeys(pathSet[index + query.filters.length]).map((fieldName) => {
            const field = query.model[fieldName.toString()];
            if(!field) {
                throw new Error(`Field ${fieldName} not found in model`);
            }
            return field;
        });

        // fields to filter by
        const filterFields = query.filters.map((fieldName) => query.model[fieldName]);

        // build the query
        let knexQuery = query.query(this.knex);

        // add where clause for all filter fields
        filterFields.forEach((filterField, i) => {
            const filterValues = this.makeKeys(pathSet[index + i]).map((value) => {
                return filterField.serialize(value);
            });
            if(filterValues.length === 1) {
                knexQuery = knexQuery.where(filterField.columnName, filterValues[0]);
            } else {
                knexQuery = knexQuery.whereIn(filterField.columnName, filterValues);
            }
        });

        return Observable.fromPromise(knexQuery.then((rows) => {
            // map rows to path values
            return flatMap(rows, (row) => {
                return fields.map((field) => {
                    const value = row[field.columnName];
                    let path = curPathSet.concat(
                        filterFields.map((filterField) => {
                            return filterField.deserialize(row[filterField.columnName]);
                        })
                    );
                    return { path, value };
                })
            });
        })).flatMap((pathValues) => {
            return Observable.fromArray(pathValues);
        });
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
            } else if(value instanceof Query) {
                return this.resolveQuery(pathSet, curPathSet, index + 1, value);
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
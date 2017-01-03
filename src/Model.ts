import * as falcor from 'falcor';
import * as knex from 'knex';
import SqlcorError from './SqlcorError';

export abstract class FieldType {
    constructor(public columnName: string) {};
    abstract serialize(data: any);
    abstract deserialize(data: any): any;
};

export class Ref {
    constructor(public path: falcor.PathSet) {};

    toAtom() {
        return {
            $type: 'ref',
            value: this.path
        };
    }
}

export type Model = {
    [key:string]: FieldType
};

export class Query {
    constructor(
        public query: (knex: knex) => knex.QueryBuilder,
        public filters: Array<string>,
        public key: string,
        public model: Model
    ) {
        if(filters.length === 0) {
            throw new SqlcorError('Query should have atleast on filter field');
        }
        if(!filters.every((fieldName) => !!this.model[fieldName])) {
            throw new SqlcorError('Filter field not found in model');
        }
        if(!this.model[key]) {
            throw new SqlcorError('Key field not found in model');
        }
    }
}

export type Graph = {
    [key:string]: Graph | Array<Graph> | Ref | number | boolean | string | null,
};
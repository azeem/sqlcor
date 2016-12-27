import * as falcor from 'falcor';

export interface Type {
    serialize(data: any);
    deserialize(): any;
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

export type Graph = {
    [key:string]: Graph | Array<Graph> | Ref | number | boolean | string | null,
};
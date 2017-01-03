import { Observable } from 'rx';
import * as falcor from 'falcor';

export default class SqlRouter implements falcor.DataSource {
    constructor() {
    }

    get(pathSets: Array<falcor.PathSet>): Observable<falcor.JSONGraphEnvelope> {
        return Observable.fromArray([]);
    }
    
    set(jsonGraphEnvelope): Observable<falcor.JSONGraphEnvelope> {
        return Observable.from([]);
    }
    
    call(functionPath, args, refSuffixes, thisPaths): Observable<falcor.JSONGraphEnvelope> {
        return Observable.from([]);
    }
}
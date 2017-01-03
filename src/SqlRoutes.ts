import * as falcor from 'falcor';
import * as pathSyntax from 'falcor-path-syntax';
import * as knex from 'knex';
import SqlcorError from './SqlcorError';
import { zip, flatMap } from 'lodash';
import { isNumbers, isKey, isRange, flattenRange } from './util';

interface RoutePattern {
    type: string,
    named: boolean,
    name: string
};
type ExtKey = falcor.Key | RoutePattern;
type ExtKeySet = Array<ExtKey>;

function isRoutePattern(obj): obj is RoutePattern {
    return !!obj.type;
}

interface RouteDef {
    route: string,
    query: (knex: knex) => knex.QueryBuilder
};

interface RouteLeafData {
    routeDef: RouteDef,
    route: ExtKeySet
};

interface RouteTreeNode {
    children?: {[key: string]: RouteTreeNode};
    leafData?: RouteLeafData;
};

export default class SqlRoutes {
    private routeTree: RouteTreeNode;

    constructor(routeDefs: Array<RouteDef>) {
        this.routeTree = {children: {}};
        routeDefs.forEach((routeDef) => {
            const parsedRoute = pathSyntax(routeDef.route, true);
            this.addRouteTreeNode(parsedRoute, routeDef, this.routeTree);
        });
    }
    
    public match(pathSet: falcor.PathSet) {
        const match = this.matchPath(pathSet);
        if(!match) {
            return null;
        }
        const [path, leafData] = match;
        const matches = {};
        for(let i = 0;i < leafData.route.length;i++) {
            const routeKey = leafData.route[i];
            if(isRoutePattern(routeKey) && routeKey.named) {
                matches[routeKey.name] = path[i];
            }
        }
        return {path, matches};
    }

    public getRouteTree() {
        return this.routeTree;
    }

    private expandIntegers(keySet: falcor.KeySet): Array<number> {
        if(typeof keySet === 'number') {
            return [keySet];
        } else if(typeof keySet === 'string' && !isNaN(+keySet)) {
            return [+keySet];
        } else if(keySet instanceof Array) {
            return flatMap<falcor.KeySet, number>(keySet, this.expandIntegers.bind(this));
        } else  if(isRange(keySet)) {
            return flattenRange(keySet);
        } else {
            throw new SqlcorError('Cannot expand to integers');
        }
    }

    private expandRanges(keySet: falcor.KeySet): Array<falcor.Range> {
        if(typeof keySet === 'number') {
            return [{from: keySet, to: keySet}];
        } else if(typeof keySet === 'string' && !isNaN(+keySet)) {
            const numVal = +keySet;
            return [{from: numVal, to: numVal}];
        } else if(keySet instanceof Array) {
            let lastRange;
            const result = Array<falcor.Range>();
            for(let key of keySet) {
                if(!isNaN(+key)) {
                    const numVal = +key;
                    if(lastRange && (lastRange.to + 1) == numVal) {
                        lastRange.to = numVal;
                    } else {
                        if(lastRange) {
                            result.push(lastRange);
                        }
                        lastRange = { from: numVal, to: numVal };
                    }
                } else {
                    if(lastRange) {
                        result.push(lastRange);
                        lastRange = null;
                    }
                    if(isRange(key)) {
                        result.push(key);
                    } else {
                        throw new SqlcorError('Cannot expand to ranges');
                    }
                }
            }
            return result;
        } else  if(isRange(keySet)) {
            return [keySet];
        } else {
            throw new SqlcorError('Cannot expand to ranges');
        }
    }

    private expandKeys(keySet: falcor.KeySet): Array<falcor.Key> {
        if(isKey(keySet)) {
            return [keySet];
        } else if(keySet instanceof Array) {
            return flatMap(keySet, this.expandKeys.bind(this));
        } else if(isRange(keySet)) {
            return flattenRange(keySet);
        } else {
            throw new SqlcorError('Cannot expand keys');
        }
    }

    private matchPath(pathSet: falcor.PathSet, treeNode: RouteTreeNode = this.routeTree, index = 0): [falcor.PathSet, RouteLeafData] | null {
        const keySet = pathSet[index];
        if(index == pathSet.length) {
            if(!treeNode.leafData) {
                return null;
            } else {
                return [[], treeNode.leafData];
            }
        }

        const matchAndShift = (keySet, nodeKey, expandFunc?) => {
            if(!treeNode.children || !treeNode.children[nodeKey]) {
                return null;
            }
            const nextNode = treeNode.children[nodeKey];
            const match = nextNode && this.matchPath(pathSet, nextNode, index + 1);
            if(match) {
                const expandedKeySet = expandFunc ? expandFunc(keySet) : keySet;
                match[0].unshift(expandedKeySet);
                return match;
            } else {
                return null;
            }
        };

        if(isKey(keySet)) {
            const match = matchAndShift(keySet, keySet.toString());
            if(match) {
                return match;
            }
        }

        if(isNumbers(keySet)) {
            let match = matchAndShift(keySet, '__integers__', this.expandIntegers.bind(this));
            if(match) {
                return match;
            }
            match = matchAndShift(keySet, '__ranges__', this.expandRanges.bind(this));
            if(match) {
                return match;
            }
        }

        const match = matchAndShift(keySet, '__keys__', this.expandKeys.bind(this));
        if(match) {
            return match;
        }
        
        return null;
    }

    private addRouteTreeNode(route: ExtKeySet, routeDef: RouteDef, treeNode: RouteTreeNode, index = 0) {
        if(index === route.length) {
            if(treeNode.leafData) {
                throw new SqlcorError(`A leaf node already exists at route ${route}`);
            }
            treeNode.leafData = { routeDef, route };
            return;
        }
        const routeElement = route[index];
        let childKey;
        if(isRoutePattern(routeElement)) {
            childKey = `__${routeElement.type}__`;
        } else {
            childKey = routeElement.toString();
        }
        if(!treeNode.children) {
            treeNode.children = {};
        }
        if(!treeNode.children[childKey]) {
            treeNode.children[childKey] = {};
        }
        this.addRouteTreeNode(route, routeDef, treeNode.children[childKey], index+1);
    }
}
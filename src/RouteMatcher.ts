import * as falcor from 'falcor';
import * as pathSyntax from 'falcor-path-syntax';
import RangeSet from './util/RangeSet';

interface NonLeafNode {
    dict?: {[key: string]: RouteTreeNode},
    rangeSet?: RangeSet
    integers?: [RouteTreeNode],
    ranges?: [RouteTreeNode],
    keys?: [RouteTreeNode]
}

interface LeafNode {
    data: any
};

interface RoutePattern {
    type: string,
    named: boolean,
    name: string
};
type ExtKeySet = falcor.KeySet | RoutePattern;
type ExtPath = Array<ExtKeySet>;

type RouteTreeNode = NonLeafNode | LeafNode;

export default class RouteMatcher {
    private routeTree: RouteTreeNode;

    constructor() {
        this.routeTree = {};
    }

    addRoute(routeString: string, data) {
        const route: ExtPath = pathSyntax(routeString, true);
        console.dir(route);
    }
}
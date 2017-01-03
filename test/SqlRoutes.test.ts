import { expect } from 'chai';
import SqlRoutes from '../src/SqlRoutes';

const mockQuery = (knex) => {  return knex.table('test'); };
const mockRouteDefs = [
    {
        route: 'never.gonna.give',
        query: mockQuery
    },
    {
        route: 'never.gonna.you',
        query: mockQuery
    },
    {
        route: 'never.[1..4].you',
        query: mockQuery
    }
];

describe('SqlRoutes', () => {
    let sqlRoute: SqlRoutes;
    before(function() {
        sqlRoute = new SqlRoutes(mockRouteDefs);
        console.log(JSON.stringify(sqlRoute.getRouteTree(), null, 2));
    });
    
    it('should match simple routes', () => {
        const result = sqlRoute.match(['never', 'gonna', 'give']);
        expect(result).to.be.ok;
        if(result === null) { return; }
        const { path, matches } = result;
        expect(path).to.eql(['never', 'gonna', 'give']);
        expect(matches).to.eql({});
    });
});
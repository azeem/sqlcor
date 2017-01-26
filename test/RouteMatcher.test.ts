import RouteMatcher from '../src/RouteMatcher';

describe('RouteMatcher', () => {
    it('should work', () => {
        const matcher = new RouteMatcher();
        matcher.addRoute('test[12].genreList[{keys:hello}]["test", "world"]', {});
    });
});
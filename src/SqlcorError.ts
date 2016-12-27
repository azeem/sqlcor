export default class SqlcorError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SqlcorError';
    }
}
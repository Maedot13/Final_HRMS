module.exports = () => (req, res, next) => {
    req.id = 'test-request-id';
    next();
};

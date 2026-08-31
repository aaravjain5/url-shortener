const BASE62_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BASE = 62;

function encode(number) {
    if (number === 0) return BASE62_CHARS[0];

    let result = '';
    while (number > 0) {
        result = BASE62_CHARS[number % BASE] + result;
        number = Math.floor(number / BASE);
    }
    return result;
}

module.exports = { encode };
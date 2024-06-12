/**
 * Adds two 2D vectors.
 * @param {number[]} vec1 - The first vector [x1, y1].
 * @param {number[]} vec2 - The second vector [x2, y2].
 * @returns {number[]} The resulting vector [x1 + x2, y1 + y2].
 */
function add([x1, y1], [x2, y2]) {
    return [x1 + x2, y1 + y2];
}

/**
 * Subtracts the second 2D vector from the first.
 * @param {number[]} vec1 - The first vector [x1, y1].
 * @param {number[]} vec2 - The second vector [x2, y2].
 * @returns {number[]} The resulting vector [x1 - x2, y1 - y2].
 */
function sub([x1, y1], [x2, y2]) {
    return [x1 - x2, y1 - y2];
}

/**
 * Multiplies a 2D vector by a scalar or another 2D vector.
 * @param {number[]} vec - The vector [x1, y1].
 * @param {number|number[]} b - The scalar or vector to multiply by.
 * @returns {number[]} The resulting vector.
 */
function mult([x1, y1], b) {
    if (Array.isArray(b)) {
        return [x1 * b[0], y1 * b[1]];
    }
    return [x1 * b, y1 * b];
}

/**
 * Rotates a 2D vector around a pivot point.
 * @param {number[]} vec - The vector [x, y].
 * @param {number} radAngle - The angle in radians.
 * @param {number[]} [pivot=[0.0, 0.0]] - The pivot point [pivotX, pivotY].
 * @returns {number[]} The rotated vector.
 */
function rotate([x, y], radAngle, [pivotX, pivotY] = [0.0, 0.0]) {
    const rX = pivotX + (x - pivotX) * Math.cos(radAngle) - (y - pivotY) * Math.sin(radAngle);
    const rY = pivotY + (x - pivotX) * Math.sin(radAngle) + (y - pivotY) * Math.cos(radAngle);
    return [rX, rY];
}

/**
 * Computes the dot product of two 2D vectors.
 * @param {number[]} vec1 - The first vector [x1, y1].
 * @param {number[]} vec2 - The second vector [x2, y2].
 * @returns {number} The dot product.
 */
function dot([x1, y1], [x2, y2]) {
    return x1 * x2 + y1 * y2;
}

/**
 * Normalizes a 2D vector.
 * @param {number} x - The x component of the vector.
 * @param {number} y - The y component of the vector.
 * @returns {number[]} The normalized vector [x / magnitude, y / magnitude].
 * @throws {Error} If the vector is a zero vector.
 */
function normalize(x, y) {
    const magnitude = Math.sqrt(x * x + y * y);
    if (magnitude === 0) throw new Error("Cannot normalize a zero vector");
    return [x / magnitude, y / magnitude];
}

export {add, sub, mult, rotate, dot, normalize}
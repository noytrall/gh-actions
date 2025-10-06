"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunk = void 0;
const chunk = (array, length) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += length)
        chunks.push(array.slice(i, i + length));
    return chunks;
};
exports.chunk = chunk;

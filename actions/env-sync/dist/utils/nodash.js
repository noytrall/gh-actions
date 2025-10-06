export const chunk = (array, length) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += length)
        chunks.push(array.slice(i, i + length));
    return chunks;
};
//# sourceMappingURL=nodash.js.map
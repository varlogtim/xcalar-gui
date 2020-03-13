function diff(setA, setB) {
    const _difference = new Set(setA);
    for (const elem of setB) {
        _difference.delete(elem)
    }
    return _difference;
}

function union(setA, setB) {
    const _union = new Set(setA)
    for (const elem of setB) {
        _union.add(elem)
    }
    return _union;
}

function intersection(setA, setB) {
    let _intersection = new Set()
    for (let elem of setB) {
        if (setA.has(elem)) {
            _intersection.add(elem)
        }
    }
    return _intersection
}
export { diff, union, intersection };
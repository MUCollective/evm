

const getTransformExpr = (sortIndex, key) => {
    const expr = sortIndex[key].map((value, i) => `datum[\"${key}\"]===\"${value}\" ? ${i} :`).join(' ')
         + ` ${sortIndex[key].length}`;
    return expr;
}


const sortOrdinalOnAxe = (sortVgSpec, {axe, sortIndex, vlSpec}) => {
    const ordinalVar = vlSpec.encoding[axe].field;
    const transformSortIndexExpr = getTransformExpr(sortIndex, ordinalVar);
    const sortIndexField = `${ordinalVar}_sort_index`;
    //region gen sort index field
    if (sortVgSpec.data && !sortVgSpec.data[0].transform) {
        sortVgSpec.data[0].transform = [];
    }
    sortVgSpec.data[0].transform.push({
        "type": "formula",
        "expr": transformSortIndexExpr,
        "as": sortIndexField
    });
    //endregion

    //region groupby sort index
    if (vlSpec.mark.type === "bar" || vlSpec.mark.type === "rect") {
        let aggIdx = sortVgSpec.data[1].transform.findIndex((elem) => elem.type == "aggregate");
        sortVgSpec.data[1].transform[aggIdx].groupby.push(sortIndexField);
    }
    //endregion

    //region sort in scale
    sortVgSpec.scales[axe == 'x' ? 0 : 1].domain.sort = {
        "field": sortIndexField,
        "op": "max"
    };
    //endregion
    return sortVgSpec;
}

const sortOrdinalOnColumnRow = (sortVgSpec, {cell, sortIndex, vlSpec}) => {
    const ordinalVar = vlSpec.encoding[cell].field;
    const transformSortIndexExpr = getTransformExpr(sortIndex, ordinalVar);
    const sortIndexField = `${ordinalVar}_sort_index`;
    //region gen sort index field
    if (sortVgSpec.data && !sortVgSpec.data[0].transform) {
        sortVgSpec.data[0].transform = [];
    }
    sortVgSpec.data[0].transform.push({
        "type": "formula",
        "expr": transformSortIndexExpr,
        "as": sortIndexField
    });
    //endregion


    //region groupby sort index
    if (vlSpec.mark.type === "bar" || vlSpec.mark.type === "rect") {
        sortVgSpec.data[1].transform[0].groupby.push(sortIndexField);
    }
    sortVgSpec.data.find(v => v.name === `${cell}_domain`).transform[0].groupby.push(sortIndexField);
    //endregion


    //region sort in mark
    sortVgSpec.marks.find(v => v.name === `${cell}_header`).sort = {
        "field": `datum[\"${sortIndexField}\"]`,
        "order": "ascending"
    };
    if (cell === "column") {
        sortVgSpec.marks.find(v => v.name === `${cell}_footer`).sort = {
            "field": `datum[\"${sortIndexField}\"]`,
            "order": "ascending"
        };
    }
    //endregion
    return sortVgSpec;
}

const sortOrdinal = (vgSpec, {vlSpec, ordinalSortIndex}) => {
    const sortVgSpec = JSON.parse(JSON.stringify(vgSpec));

	const sortIndex = ordinalSortIndex;

    if (vlSpec.encoding.x && Object.keys(sortIndex).includes(vlSpec.encoding.x.field) && !vlSpec.encoding.x.aggregate) {
        sortOrdinalOnAxe(sortVgSpec, {axe: 'x', sortIndex, vlSpec});
    }
    if (vlSpec.encoding.y && Object.keys(sortIndex).includes(vlSpec.encoding.y.field) && !vlSpec.encoding.y.aggregate) {
        sortOrdinalOnAxe(sortVgSpec, {axe: 'y', sortIndex, vlSpec});
    }
    if (vlSpec.encoding.column && Object.keys(sortIndex).includes(vlSpec.encoding.column.field)) {
        sortOrdinalOnColumnRow(sortVgSpec, {cell: 'column', sortIndex, vlSpec});
    }
    if (vlSpec.encoding.row && Object.keys(sortIndex).includes(vlSpec.encoding.row.field)) {
        sortOrdinalOnColumnRow(sortVgSpec, {cell: 'row', sortIndex, vlSpec});
    }

    return sortVgSpec;
};

export { sortOrdinal };
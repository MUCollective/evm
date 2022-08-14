

const getTransformExpr = (sortIndex, key) => {
    const expr = sortIndex[key].map((value, i) => `datum[\"${key}\"]===\"${value}\" ? ${i} :`).join(' ')
         + ` ${sortIndex[key].length}`;
    return expr;
}


const sortOrdinalOnAxe = (sortVgSpec, {axe, sortIndex, vlSpec, isModeling}) => {
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
    sortVgSpec.scales[axe === 'x' ? 0 : 1].domain.sort = {
        "field": sortIndexField,
        "op": "max"
    };
    if (axe === 'y' && !isModeling) { // y axe sorting hack 
        sortVgSpec.scales[axe === 'x' ? 0 : 1].domain.sort.order = 'descending';
    }
    //endregion
    return sortVgSpec;
}

const sortOrdinalOnColumnRow = (sortVgSpec, {cell, sortIndex, vlSpec, isModeling}) => {
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

const sortModels = (sortVgSpec, {sortIndex, vlSpec, modelVar}) => {
    const transformSortIndexExpr = getTransformExpr(sortIndex, modelVar);
    const sortIndexField = `${modelVar}_sort_index`;
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
    sortVgSpec.data.find(v => v.name === `row_domain`).transform[0].groupby.push(sortIndexField);
    //endregion

    //region sort in mark
    sortVgSpec.marks.find(v => v.name === `row_header`).sort = {
        "field": `datum[\"${sortIndexField}\"]`,
        "order": "ascending"
    };

    sortVgSpec.marks.find(v => v.style === `cell`).from.facet.groupby.push(sortIndexField);
    delete sortVgSpec.marks.find(v => v.style === `cell`).from.facet.aggregate;
    sortVgSpec.marks.find(v => v.style === `cell`).sort = {
        "field": `datum[\"${sortIndexField}\"]`,
        "order": "ascending"
    };
    //endregion

    //region sort in scale
    sortVgSpec.scales.find(s => s.name === 'color').domain = sortIndex[modelVar];
    //endregion
    return sortVgSpec;
}

const sortOrdinal = (vgSpec, {vlSpec, ordinalSortIndex, isModeling, models}) => {
    const sortVgSpec = JSON.parse(JSON.stringify(vgSpec));

	const sortIndex = ordinalSortIndex;

    if (vlSpec.encoding.x && Object.keys(sortIndex).includes(vlSpec.encoding.x.field) && !vlSpec.encoding.x.aggregate) {
        sortOrdinalOnAxe(sortVgSpec, {axe: 'x', sortIndex, vlSpec, isModeling});
    }
    if (vlSpec.encoding.y && Object.keys(sortIndex).includes(vlSpec.encoding.y.field) && !vlSpec.encoding.y.aggregate) {
        sortOrdinalOnAxe(sortVgSpec, {axe: 'y', sortIndex, vlSpec, isModeling});
    }
    if (vlSpec.encoding.column && Object.keys(sortIndex).includes(vlSpec.encoding.column.field)) {
        sortOrdinalOnColumnRow(sortVgSpec, {cell: 'column', sortIndex, vlSpec, isModeling});
    }
    if (vlSpec.encoding.row && Object.keys(sortIndex).includes(vlSpec.encoding.row.field)) {
        sortOrdinalOnColumnRow(sortVgSpec, {cell: 'row', sortIndex, vlSpec, isModeling});
    }

    if (isModeling) {
        const modelVar = "modelcheck_group";
        const sortIndex = {[modelVar]: ["data"].concat(models.map(m => m.name))};
        sortModels(sortVgSpec, {sortIndex, vlSpec, modelVar});
    }

    return sortVgSpec;
};

export { sortOrdinal };
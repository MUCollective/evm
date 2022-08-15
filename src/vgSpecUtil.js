

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
        let aggIdx = sortVgSpec.data[1].transform.findIndex((elem) => elem.type == "aggregate"),
            varIdx = sortVgSpec.data[1].transform[aggIdx].groupby.findIndex((elem) => elem == ordinalVar);
        sortVgSpec.data[1].transform[aggIdx].groupby.splice(varIdx + 1, 0, sortIndexField); // insert sort index behind its corresponding variable in the groupby
    }
    //endregion

    //region sort in scale
    sortVgSpec.scales[axe === 'x' ? 0 : 1].domain.sort = { // (Alex: maybe not an issue to overwrite the sort?)
        "field": sortIndexField,
        "op": "max"
    };
    if (axe === 'y' && !isModeling) { // y axe sorting hack (Alex: this could create edge cases, not sure)
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
        let aggIdx = sortVgSpec.data[1].transform.findIndex((elem) => elem.type == "aggregate"),
            varIdx = sortVgSpec.data[1].transform[aggIdx].groupby.findIndex((elem) => elem == ordinalVar);
        sortVgSpec.data[1].transform[aggIdx].groupby.splice(varIdx + 1, 0, sortIndexField); // insert sort index behind its corresponding variable in the groupby
    }
    let aggIdx = sortVgSpec.data.find(v => v.name === `${cell}_domain`).transform.findIndex((elem) => elem.type == "aggregate"),
        varIdx = sortVgSpec.data.find(v => v.name === `${cell}_domain`).transform[aggIdx].groupby.findIndex((elem) => elem == ordinalVar);
    sortVgSpec.data.find(v => v.name === `${cell}_domain`).transform[aggIdx].groupby.splice(varIdx + 1, 0, sortIndexField); // insert sort index behind its corresponding variable in the groupby
    //endregion


    //region sort in mark
    sortVgSpec = replaceSortOnColumnRow(sortVgSpec, cell, ordinalVar, sortIndexField);
    // (Alex: overwriting sorts here was creating multiple problems)
    // sortVgSpec.marks.find(v => v.name === `${cell}_header`).sort = {
    //     "field": `datum[\"${sortIndexField}\"]`,
    //     "order": "ascending"
    // };
    // if (cell === "column") {
    //     sortVgSpec.marks.find(v => v.name === `${cell}_footer`).sort = {
    //         "field": `datum[\"${sortIndexField}\"]`,
    //         "order": "ascending"
    //     };
    // }

    // need to substitute sort index in data encoding cell as well
    let cellRef = sortVgSpec.marks.find(v => (v.type === `group` && v.from && v.from.facet)),
        varCellIdx = cellRef.from.facet.groupby.findIndex((elem) => elem == ordinalVar);
    cellRef.from.facet.groupby.splice(varCellIdx, 1, sortIndexField); // at the cell level, replace ordinal variable with its sort index
    sortVgSpec = replaceSort(sortVgSpec, cellRef, ordinalVar, sortIndexField); 
    //endregion

    return sortVgSpec;
}

const replaceSortOnColumnRow = (sortVgSpec, cell, ordinalVar, sortIndexField) => {
    let headerRef = sortVgSpec.marks.find(v => v.name === `${cell}_header`),
        footerRef = sortVgSpec.marks.find(v => v.name === `${cell}_footer`);
    if (headerRef) {
        sortVgSpec = replaceSort(sortVgSpec, headerRef, ordinalVar, sortIndexField);
    }
    if (cell === "column" && footerRef) {
        sortVgSpec = replaceSort(sortVgSpec, footerRef, ordinalVar, sortIndexField);    
    }

    return sortVgSpec;
}

const replaceSort = (sortVgSpec, ref, ordinalVar, sortIndexField) => {
    // expects a defined ref
    if (ref.sort && Array.isArray(ref.sort.field)) {
        // code below expects field to be an array
        let varIdx = ref.sort.field.findIndex((elem) => elem.includes(ordinalVar)); 
        if (varIdx != -1) {
            ref.sort.field.splice(varIdx, 1, `datum[\"${sortIndexField}\"]`); // replace ordinal variable with its sort index
            ref.sort.order.splice(varIdx, 1, "ascending");
        } else {
            console.log("THIS EDGE CASE COULD CAUSE AN ERROR");
            ref.sort.field.push(`datum[\"${sortIndexField}\"]`); // (Alex: this edge case should never happen? might result in problems to just push since order of sort matters)
            ref.sort.order.push("ascending");
        }
    } else if (ref.sort) {    
        if (ref.sort.field.includes(ordinalVar)) {
            ref.sort.field = `datum[\"${sortIndexField}\"]`; // overwrite existing sort
        } else {
            console.log("THIS EDGE CASE COULD CAUSE AN ERROR");
            ref.sort.field = [ref.sort.field, `datum[\"${sortIndexField}\"]`]; // extend array (Alex: could cause problems bc order of sort matters)
            ref.sort.order = [ref.sort.order, "ascending"];
        }
    } else {
        ref.sort = {
            "field": `datum[\"${sortIndexField}\"]`,
            "order": "ascending"
        };
    }

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
        let aggIdx = sortVgSpec.data[1].transform.findIndex((elem) => elem.type == "aggregate"),
            varIdx = sortVgSpec.data[1].transform[aggIdx].groupby.findIndex((elem) => elem == modelVar);
        sortVgSpec.data[1].transform[aggIdx].groupby.splice(varIdx + 1, 0, sortIndexField); // insert sort index behind its corresponding variable in the groupby
    }
    if (sortVgSpec.data.some(v => v.name === `row_domain`)) {
        let rowRef = sortVgSpec.data.find(v => v.name === `row_domain`),
            aggIdx = rowRef.transform.findIndex((elem) => elem.type == "aggregate"),
            varIdx = rowRef.transform[aggIdx].groupby.findIndex((elem) => elem == modelVar);
        if (varIdx != -1) {
            rowRef.transform[aggIdx].groupby.splice(varIdx + 1, 0, sortIndexField); // insert sort index behind its corresponding variable in the groupby
            //subregion sort in row_header/footer marks
            sortVgSpec = replaceSortOnColumnRow(sortVgSpec, "row", modelVar, sortIndexField);
            //endsubregion
        }
    }
    if (sortVgSpec.data.some(v => v.name === `column_domain`)) {
        let colRef = sortVgSpec.data.find(v => v.name === `column_domain`),
            aggIdx = colRef.transform.findIndex((elem) => elem.type == "aggregate"),
            varIdx = colRef.transform[aggIdx].groupby.findIndex((elem) => elem == modelVar);
        if (varIdx != -1) {
            colRef.transform[aggIdx].groupby.splice(varIdx + 1, 0, sortIndexField); // insert sort index behind its corresponding variable in the groupby
            //subregion sort in column_header/footer marks
            sortVgSpec = replaceSortOnColumnRow(sortVgSpec, "column", modelVar, sortIndexField);
            //endsubregion
        }
    }
    //endregion

    //region sort in mark
    // sorting within row/column_headers/footers in above subregions, so we don't have to repeat logic here
    // (Alex: overwriting this sort fails in most edge cases)
    // sortVgSpec.marks.find(v => v.name === `row_header`).sort = {
    //     "field": `datum[\"${sortIndexField}\"]`,
    //     "order": "ascending"
    // };

    let cellRef = sortVgSpec.marks.find(v => (v.type === `group` && v.from && v.from.facet)),
        varIdx = cellRef.from.facet.groupby.findIndex((elem) => elem == modelVar);
    cellRef.from.facet.groupby.splice(varIdx, 1, sortIndexField); // at the cell level, replace ordinal variable with its sort index
    // delete cellRef.from.facet.aggregate; // (Alex: not sure why we're getting rid of cross?)
    sortVgSpec = replaceSort(sortVgSpec, cellRef, modelVar, sortIndexField); 
    // (Alex: overwriting this sort fails in most edge cases)
    // cellRef.sort = {
    //     "field": `datum[\"${sortIndexField}\"]`,
    //     "order": "ascending"
    // };
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
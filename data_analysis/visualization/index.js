const keys = [
    "meta",
    "load dataset",
    "enter userId",
    "drop var on shelf",
    "remove var from shelf",
    "add model",
    "remove model",
    "add filter",
    "remove filter",
    "add transformation",
    "remove transformation",
    "turn on/off model checking",
    "show/hide residuals"
];

const nameToKeys = {
    "meta": "meta",
    "load dataset": "load dataset",
    "start": "enter userId",
    "turn on model checking": "turn on/off model checking",
    "turn off model checking": "turn on/off model checking",
    "dnd finalize": "drop var on shelf",
    "remove variable": "remove var from shelf",
    "add model": "add model",
    "remove model": "remove model",
    "add filter": "add filter",
    "remove filter": "remove filter",
    "add transformation": "add transformation",
    "remove transformation": "remove transformation",
    "show residuals": "show/hide residuals",
    "hide residuals": "show/hide residuals"
}

const color = d3.scaleOrdinal()
                .domain(keys)
                .range(["black"].concat(d3.schemePaired));

const margin = {top: 20, right: 90, bottom: 30, left: 90},
    width  = 1500 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

const nodeR = 10;

const treemap = d3.tree().size([height, width]);

const svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom),
    g = svg.append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

svg.selectAll("legend-dots")
    .data(keys)
    .enter()
    .append("circle")
    .attr("cx", width - 300)
    .attr("cy", function(d,i){ return 100 + i*25})
    .attr("r", 7)
    .style("fill", function(d){ return color(d)})

svg.selectAll("legend-labels")
    .data(keys)
    .enter()
    .append("text")
    .attr("x", width - 280)
    .attr("y", function(d,i){ return 100 + i*25})
    .style("fill", function(d){ return color(d)})
    .text(function(d){ return d})
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle")

fetch("test.json") // replace test.json with your json's path
    .then(response => response.json())
    .then(json => {
        console.log('load test.js')
        const treeData = json;

        let nodes = d3.hierarchy(treeData, d => d.children);

        nodes = treemap(nodes);
        console.log(nodes.descendants())

        const link = g.selectAll(".link")
            .data( nodes.descendants().slice(1))
            .enter().append("path")
            .attr("class", "link")
            .style("stroke", d => "black") ////
            .style("fill", "transparent")
            .attr("d", d => {
                return "M" + d.y + "," + d.x
                    + "C" + (d.y + d.parent.y) / 2 + "," + d.x
                    + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
                    + " " + d.parent.y + "," + d.parent.x;
            });


        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("visibility", "hidden")
            .style("position", "absolute")
            .style("background-color", "rgb(177,177,177)")
            .style("border", "solid")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px")


        const node = g.selectAll(".node")
            .data(nodes.descendants())
            .enter().append("g")
            .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
            .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

        node.append("circle")
            .attr("r", d => nodeR)
            // .style("stroke", d => "black")
            .style("fill", d => color(nameToKeys[d.data.name]));

        // node.append("text")
        //     .attr("dy", ".35em")
        //     .attr("x", d => d.children ? -nodeR : nodeR)
        //     .attr("y", d => d.children && d.depth !== 0 ? -nodeR * 0.7 : nodeR * 0.7)
        //     .style("text-anchor", d => d.children ? "end" : "start")
        //     .text(d => d.data.name.length > 10 ? d.data.name.substr(0, 10) + '...' : d.data.name);



        node
            .on("mouseover", function(mouseEvent, d){
                tooltip.style("visibility", "visible")
                d3.select(this).select("circle")
                    .style("stroke", d => "red")
                    .style("stroke-width", d => 3)
            })
            .on("mousemove", function(mouseEvent, d){
                tooltip
                    .html(d.data.name !== 'meta' ?
                        `type: ${nameToKeys[d.data.name]}<br/>
datasetName: ${d.data.datasetName}<br/>
info: ${d.data.info}<br/>
shelf x: ${d.data.dndState[1].items[0] ? d.data.dndState[1].items[0].name : ''}<br/>
shelf y: ${d.data.dndState[2].items[0] ? d.data.dndState[2].items[0].name : ''}<br/>
shelf row: ${d.data.dndState[3].items[0] ? d.data.dndState[3].items[0].name : ''}<br/>
shelf col: ${d.data.dndState[4].items[0] ? d.data.dndState[4].items[0].name : ''}<br/>
modelCheck: ${d.data.modelChecking}<br/>
modeling: ${d.data.modeling}<br/>
models: ${d.data.models.map(m => m.name)}<br/>
showPredOrRes: ${d.data.showPredictionOrResidual}<br/>
filters: ${d.data.filters.map(f => `variable: [${f.varToFilter}] condition: [${f.includeOrExclude}] [${f.condition}] value: [${f.conditionValue1}] [${f.conditionValue2}]`)}<br/>
transforms: ${d.data.transforms.map(t => `variable: [${t.transVar}] transform: [${t.transform}]`)}` : 'meta root')
                    .style("left", mouseEvent.pageX + "px")
                    .style("top", mouseEvent.pageY + "px")
            })
            .on("mouseout", function(){
                tooltip.style("visibility", "hidden")
                d3.select(this).select("circle")
                    .style("stroke", d => undefined)
            });


    });
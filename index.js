const graphContainer = document.getElementById("graphContainer")
const fileAcceptor = document.getElementById("fileAcceptor")
const convertBtn = document.getElementById("convertBtn")
const changeClr = document.getElementById("changeClr")
const changeSize = document.getElementById("changeSize")
const changeFontSize = document.getElementById("changeFontSize")
const changeRootName = document.getElementById("changeRootName")

let fileUrl = ""
let svgFileName = ""//to save the svg in this filename
let sheetIndex = 0

let rootSize = 50
let boxSize = 15
let siteRadius = 2
let svgSize = 3

let fontSizes = {
    rootFont: 15,
    geneFont: 10,
    siteFont: 10
}

const colors = {
    pathClr: "#555",
    UDDUClr: "green",
    UUDDClr: "blue",
    bothClr: "red",
}
const frequencyArr = []
let rootText = "root"


function defaultValueLoader() {// to set the initial value in the input placeholder
    document.getElementById("clrInpt1").value = "#595A6E"
    document.getElementById("clrInpt2").value = "#15E523"
    document.getElementById("clrInpt3").value = "#4391DB"
    document.getElementById("clrInpt4").value = "#E50606"

    document.getElementById("number1").value = 50
    document.getElementById("number2").value = 15
    document.getElementById("number3").value = 2
    document.getElementById("number4").value = 3

    document.getElementById("fsize1").value = 15
    document.getElementById("fsize2").value = 10
    document.getElementById("fsize3").value = 10
}
defaultValueLoader()

convertBtn.addEventListener("click", (e) => { //fetching the file metadata from the user file selection
    e.preventDefault()
    const acceptedFormat = ["xlsx", "xls"]
    const fileInputBtn = document.getElementById("fileInputBtn")
    sheetIndex = document.getElementById("sheetIndexInpt").value - 1
    if (!document.getElementById("sheetIndexInpt").value) {
        sheetIndex = 0
    }
    if (sheetIndex < 0) {
        return alert("Sheet number starts from 1 or above!!!!")
    }
    const file = fileInputBtn.files[0]
    if (!file) {
        return fileInputBtn.click()
    }
    svgFileName = file.name.split(".")[0]
    const fileExtension = file.name.split(".").pop()

    if (acceptedFormat.includes(fileExtension.toLowerCase())) {
        fileUrl = URL.createObjectURL(file)
        fileAcceptor.style.display = "none"
        graphContainer.style.display = "block"
        fetchFileData(fileUrl, sheetIndex)
    }
    else {
        alert("Select only excel file")
        window.location.reload()
    }
})

changeClr.addEventListener("click", (e) => {
    e.preventDefault()
    colors.pathClr = document.getElementById("clrInpt1").value || "#595A6E"
    colors.UDDUClr = document.getElementById("clrInpt2").value || "#4391DB"
    colors.UUDDClr = document.getElementById("clrInpt3").value || "#15E523"
    colors.bothClr = document.getElementById("clrInpt4").value || "#E50606"

    document.getElementById("chart").innerHTML = ""
    fetchFileData(fileUrl, sheetIndex)

})


changeSize.addEventListener("click", (e) => {
    e.preventDefault()
    rootSize = parseInt(document.getElementById("number1").value)
    boxSize = parseInt(document.getElementById("number2").value)
    siteRadius = parseInt(document.getElementById("number3").value)
    svgSize = parseInt(document.getElementById("number4").value)

    if (rootSize < 1 || boxSize < 1 || siteRadius < 1 || svgSize < 1) {
        return alert("Size value must be more than zero !!!!")
    }

    document.getElementById("chart").innerHTML = ""
    fetchFileData(fileUrl, sheetIndex)

})

changeFontSize.addEventListener("click", (e) => {
    e.preventDefault()
    fontSizes.rootFont = parseInt(document.getElementById("fsize1").value) || 15
    fontSizes.geneFont = parseInt(document.getElementById("fsize2").value) || 10
    fontSizes.siteFont = parseInt(document.getElementById("fsize3").value) || 10

    document.getElementById("chart").innerHTML = ""
    fetchFileData(fileUrl, sheetIndex)

})
changeRootName.addEventListener("click", e => {
    e.preventDefault()
    rootText = document.getElementById("rootInput").value
    document.getElementById("chart").innerHTML = ""
    fetchFileData(fileUrl, sheetIndex)
})

// fetchFileData("Nucleocytoplasmic transport.xlsx", 0)

function fetchFileData(fileUrl, sheetIndex) { //fetch the data from the spreadsheet and preprocess the data for the chart 
    console.log(fileUrl);
    fetch(fileUrl)
        .then(res => res.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(data, { type: "array" })
            const sheetName = workbook.SheetNames[sheetIndex]
            if (!sheetName) {
                alert("There is no sheet found using this sheet number try again")
                window.location.reload()
            }
            const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
            const root = {
                name: rootText,
                children: [],
                code: "none"
            };

            const geneMap = new Map(); //container for the genes
            sheetData.forEach(e => {
                const gene = e.proteins; //!todo protiens to gene and C->c
                const site = e.sites;
                const code = e.Code.split("+")[0]
                const frequency = e.Frequency

                if (!geneMap.has(gene)) {
                    geneMap.set(gene, { name: gene, children: [], frequency, code });
                    root.children.push(geneMap.get(gene));
                }

                const geneNode = geneMap.get(gene);
                if (!geneNode.children.find(child => child.name === site)) {
                    geneNode.children.push({ name: site, frequency, code });//pushing the sites to its corresponding gene
                    frequencyArr.push(frequency)
                }
            });
            drawChart(root)
        })
        .catch(err => {
            console.error("Error Found !!!", err);
            alert("Error found :", err, " Check your input file with names (genes,sites,code,Frequency) also match the case")
        })
}
//handle the creation of the chart
function drawChart(data) {
    const width = 1200;
    const cx = width * 0.5
    const radius = width / 2 - (50 * svgSize);

    //selecting the svg with id name chart
    const svg = d3
        .select("svg")
        .attr("height", width)
        .attr("width", width)
        .attr("viewBox", [-cx, -cx, width, width])
        .style("border", "2px solid red")
        .attr("style", "width:100%;height:auto;")

    const tree = d3
        .tree()
        .size([2 * Math.PI, radius])//defining use 360deg and radius for diameter of chart
        .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth)

    const root = tree(d3  //creating the data into a tree structured data
        .hierarchy(data)
        .sort((a, b) => d3.ascending(a.data.name, b.data.name))
    )

    // plotting lines 
    svg
        .append("g")
        .attr("fill", "none")
        .attr("stroke", colors.pathClr)
        .attr("stroke-opacity", 1)
        .attr("stroke-width", 0.75)
        .selectAll()
        .data(root.links())
        .join("path")
        .attr("d", d3.linkRadial()
            .angle(d => d.x)
            .radius(d => {
                if (d.depth == 1 && !d.children) {
                    return d.y + 90 + (d.data.frequency / Math.min(...frequencyArr)) * siteRadius
                }
                return d.y + 30
            }))

    //plotting rectangles(box) and circles
    svg
        .append("g")
        .selectAll()
        .data(root.descendants())
        .join(function (e) {
            const node = e.append("g")
            node.filter(d => d.children)
                .append("rect")
                .attr("x", d => d.depth === 0 ? -(rootSize / 2) : -15)
                .attr("y", d => d.depth === 0 ? -(rootSize / 2) : 0 - (boxSize / 2))
                .attr("width", d => d.depth === 0 ? rootSize : boxSize)
                .attr("height", d => d.depth === 0 ? rootSize : boxSize)
                .attr("fill", d => colorForGenes(d))

            node.filter(d => !d.children)
                .append("circle")
                .attr("r", d => (d.data.frequency / Math.min(...frequencyArr)) * siteRadius)
                .attr("fill", d => colorForSites(d))
                .attr("stroke", "black")
                .call(d3.drag()
                    .on("start", dragStarted)
                    .on("drag", draggingCircle)
                    .on("end", dragEnded)
                )

            return node
        })
        .attr("stroke", "black")
        .attr("transform", d => alignShapes(d))


    function dragStarted() {
        d3.select(this).raise().classed("active", true);
    }
    function draggingCircle(d) { //drag controls
        console.log(d.y, d3.event.y);
        d3.select(this) //adjust the values as required
            .attr("transform", `rotate(${90}) translate(${d.x >= Math.PI ? d3.event.y - (600 - 50 * svgSize) : d3.event.y - (600 - 50 * svgSize)},${-d3.event.x})`)
    }
    function dragEnded() {
        d3.select(this).classed("active", false);
    }

     //alligning rectangles and circles based on their depth,x, y
    function alignShapes(d) {
        if (d.depth === 0) {
            return `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y + 20},-3)`
        }
        else if (d.depth == 1 && !d.children) {
            return `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y + 70},-3)`
        }
        else if (d.depth == 1 && d.children) {
            return `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},${d.x >= Math.PI ? -3 : 0})`
        }
        else
            return `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`
    }

    // giving color for gene based on the code 
    function colorForGenes(d) {
        let found = {
            1: false,
            2: false
        }
        let color = ""
        d.children.forEach(e => {
            if (e.data.code === "UDDU") {
                found[1] = true
            } else if (e.data.code === "UUDD") {
                found[2] = true
            }
        })
        if (found[1] == true && found[2] == true) {
            color = colors.bothClr
        }
        else if (found[1] == true || found[2] == true) {
            if (d.data.code == "UUDD") {
                color = colors.UUDDClr
            }
            else if (d.data.code == "UDDU") {
                color = colors.UDDUClr
            }
        }
        return color
    }
     // giving color to the site based on the code 
    function colorForSites(d) {
        if (d.data.code == "UUDD") {
            return colors.UUDDClr
        }
        else if (d.data.code == "UDDU") {
            return colors.UDDUClr
        }
    }

    // adding text to each nodes
    svg
        .append("g")
        .selectAll()
        .data(root.descendants())
        .join("text")
        .attr("transform", d => alignText(d))
        .style("font-size", d => fontSize(d))
        .style("font-weight", "bold")
        .attr("dy", "0.1em")
        .text(d => d.data.name)


    //handling the font size based on depth and input by user
    function fontSize(d) {
        if (d.depth === 0) {
            return fontSizes.rootFont
        }
        else if (d.depth === 1 && d.children) {
            return fontSizes.geneFont
        }
        else if ((d.depth === 2 && !d.children) || (d.depth == 1 && !d.children)) {
            return fontSizes.siteFont
        }
    }

    // aligning the text position
    function alignText(d) {
        if (d.depth === 0) {
            return `rotate(${0})
                    translate(${d.x - (rootSize / 2) + 10},${d.y + 20})
                    `
        }
        else if (d.depth == 1 && !d.children) {
            return `rotate(${d.x * 180 / Math.PI - 90})
                    translate(${d.x >= Math.PI ? d.y + (d.data.frequency / Math.min(...frequencyArr) * siteRadius) + 120 : d.y + 10},0) 
                    rotate(${d.x >= Math.PI ? 180 : 0})
                    `
        }
        else if (d.depth === 1) {
            return `rotate(${d.x * 180 / Math.PI - 90})
                    translate(${d.x >= Math.PI ? d.y + 30 + boxSize : d.y - 10 + boxSize},0) 
                    rotate(${d.x >= Math.PI ? 180 : 0})
                    `
        }
        else if (d.depth === 2 && !d.children) {
            return `rotate(${d.x * 180 / Math.PI - 90})
                translate(${d.x >= Math.PI ? (d.y + (d.data.frequency / Math.min(...frequencyArr) * siteRadius)
                    + 50) : (d.y + (d.data.frequency / Math.min(...frequencyArr) * siteRadius) + 25)},0) 
                rotate(${d.x >= Math.PI ? 180 : 0})
            `
        }
    }
}

// downloading the svg graph
const svgElement = document.querySelector("#chart");
const downloadButton = document.querySelector("#downloadButton");

//converting the chart into svg
downloadButton.addEventListener("click", () => {
    const svgContent = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = svgFileName
    link.click();
});

//handling the edit button
const editingBtns = document.getElementById("editingBtns")

editingBtns.onclick = () => {
    const editBtn = document.getElementById("editBtn")
    const closeBtn = document.getElementById("closeBtn")
    const optionsContainer = document.getElementById("optionsContainer")
    if (editBtn.style.display !== "none") {
        editBtn.style.display = "none"
        closeBtn.style.display = "flex"
        optionsContainer.style.display = "flex"
    } else {
        editBtn.style.display = "flex"
        closeBtn.style.display = "none"
        optionsContainer.style.display = "none"
    }
}
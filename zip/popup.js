window.onload = function () {
    const start = document.getElementById('start')
    start.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
            let activeTab = tabs[0];
            let activeTabId = activeTab.id;

            return chrome.scripting.executeScript({
                target: { tabId: activeTabId },
                func: solver
            })
        }).then((result) => {
            document.getElementById('result').innerHTML = result
        })
        start.style.disabled = true;
    })
}

function solver() {
    console.log("solver")

    function triggerMouseEvent(node, eventType) {
        let clickEvent = new Event(eventType, { bubbles: true, cancelable: true });
        node.dispatchEvent(clickEvent);
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function click(node) {
        triggerMouseEvent(node, "mousedown")
        triggerMouseEvent(node, "mouseup")
    }

    function fetchGridData() {
        let source = document.getElementsByClassName('game-launch-page__iframe')?.[0]?.contentDocument || document
        let gridElement = Array.from(source.getElementsByClassName('trail-cell'));
        let nodeData = Array.from(gridElement, e => 
                            Array.from(e.children)
                                .filter(e2 => e2.classList.contains('trail-cell-content'))
                        ).map(e => e[0]?.classList.contains('trail-cell-content') ? parseInt(e[0].innerText) : 0)
        let wallData = Array.from(gridElement, e => 
                            Array.from(e.children)
                                .filter(e2 => e2.classList.contains('trail-cell-wall'))
                                .map(e => e.classList)
                                .map(e => e?.[1].split('--')[1])
                            )
        return [gridElement, nodeData, wallData]
    }

    const dirNames = ['top', 'right', 'bottom', 'left']

    function neighbour(walls) {
        return (index, dir) => {
            switch (dir) {
                case 'top':
                    let top = index - size
                    if (index < size || walls[top].includes('down')) return undefined
                    else return top
                case 'right':
                    let right = index + 1
                    if (right % size === 0 || walls[index].includes('right')) return undefined
                    else return right
                case 'bottom':
                    let bottom = index + size
                    if (bottom >= (size * size) || walls[index].includes('down')) return undefined
                    else return bottom
                case 'left':
                    let left = index - 1
                    if (index % size === 0 || walls[left].includes('right')) return undefined
                    else return left
            }
        }
    }

    function recurse(graph, currentNode, currentNumber, nextInPath, nodes) {
        //console.log(currentNode, currentNumber, nextInPath) 
        if(currentNumber + 1 == nodes.length) return nextInPath.length == graph.length - 1 ? nextInPath : []
        for(let neigh of graph[currentNode]) {
            // current neighbour has outgoing path, we cant cross it
            if(nextInPath.includes(neigh)) continue 
            // if neigh is a node, reach it only if it's the next number
            if(nodes.includes(neigh)) {
                if(nodes[currentNumber + 1] != neigh) continue
                else {
                    //console.log(currentNode, currentNumber)
                    //console.log(nextInPath)
                    let res = recurse(graph, neigh, currentNumber + 1, nextInPath.concat([neigh]), nodes)
                    if(res.length) return res
                    //console.log("backtrack node", currentNode, neigh, nextInPath)
                }
            } else {
    
                // else, by all means, go through it, correct or not is a problem for later
                let res = recurse(graph, neigh, currentNumber, nextInPath.concat([neigh]), nodes)
                if(res.length) return res
                //console.log("backtrack neigh", currentNode, neigh, nextInPath)
            }
        }
        //console.log(1, currentNode, currentNumber, nextInPath.length)
        //console.log(nextInPath)
        return []
    }

    let [gridElement, nodeData, wallData] = fetchGridData()

    const size = parseInt(Math.sqrt(gridElement.length))
    
    console.log(gridElement, nodeData, wallData, size)

    const neighbours = neighbour(wallData)

    const nodes = nodeData.map((e, i) => [e, i]).filter(e => e[0]).sort((a, b) => a[0] - b[0]).map(e => e[1])
    const graph = nodeData.map((e, i) => dirNames.map(dir => neighbours(i, dir)).filter(e => e !== undefined))

    const path = recurse(graph, nodes[0], 0, [], nodes)
    console.log(path)
    path.forEach(e => click(gridElement[e]))
}
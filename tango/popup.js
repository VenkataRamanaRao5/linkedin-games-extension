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
            document.getElementById('result').innerHTML = result.toString()
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

    async function SunMoonLabels(emptyElement) {
        click(emptyElement)
        await delay(5)
        let first = label(emptyElement)

        click(emptyElement)
        await delay(5)
        let second = label(emptyElement)

        click(emptyElement)
        return [first, second]
    }

    const label = (contentCell) => contentCell.firstElementChild.lastElementChild.ariaLabel

    async function fetchGridData() {
        const iframe = document.getElementsByClassName('game-launch-page__iframe')?.[0]?.contentDocument;
        const gridElement = Array.from(iframe?.getElementsByClassName('gil__grid')?.[0]?.children || document.getElementsByClassName('gil__grid')[0].children);
        let labels = gridElement.map(el => Array.from(el.children).filter(ch => ch.tagName !== "SPAN").map(ch => [ch.classList, ch.firstElementChild.ariaLabel]));
        console.log(iframe, gridElement, labels)
        for (let i = 0; i < labels.length; i++) {
            labels[i][0] = labels[i][0][1] // remove class for content
            for (let j = 1; j < labels[i].length; j++) // extract direction from class for edge content 
                labels[i][j] = [labels[i][j][0].toString().split('--')[1], labels[i][j][1]]
        }
        console.log(labels)
        let grid = labels.map(el => el[0])
        let emptyIndex = grid.findIndex(el => el == "Empty")
        let emptyElement = gridElement[emptyIndex]
        console.log(grid, emptyIndex, emptyElement)
        let [first, second] = await SunMoonLabels(emptyElement)
        console.log(first, second)

        grid = grid.map(el => {
            if (el == "Empty") return 0
            else if (el == first) return 1
            else return 2
        })

        let equalPairs = Array.from({ length: 36 }, () => [])
        let unequalPairs = Array.from({ length: 36 }, () => [])

        for (let i = 0; i < labels.length; i++) {
            for (let j = 1; j < labels[i].length; j++) {
                let secondIndex = (labels[i][j][0] == "right") ? i + 1 : i + 6
                console.log(i, j, labels[i][j], secondIndex)
                if (labels[i][j][1] == "Equal")
                    equalPairs[secondIndex].push(i)
                else
                    unequalPairs[secondIndex].push(i)
            }
        }
        return [gridElement, grid, equalPairs, unequalPairs]

    }

    const size = 6

    const getRow = (grid, pos) => grid.filter((e, index) => Math.floor(index / size) == Math.floor(pos / size))
    const getCol = (grid, pos) => grid.filter((e, index) => index % size == pos % size)
    const together = (arr, val) => [0, 1, 2, 3].map(i => arr.slice(i, i + 3).every(e => e == val)).some(e => e)
    const unequallyFilled = (arr, val1, val2) => arr.filter(e => e != val1 && e != val2).length == 0 && (arr.filter(e => e == val1).length != arr.filter(e => e == val2).length)

    function recurse(grid, index, locked, equalPairs, unequalPairs) {
        let e = equalPairs[index] || [], un = unequalPairs[index] || []
        let either = e.length || un.length, both = e.length && un.length;
        let eqs = e.map(ind => grid[ind]), uneqs = un.map(ind => grid[ind])
        let eqvalue = 0, uneqvalue = 0
        if (index > 35) return true
        if (locked.findIndex(e => e == index) > -1) return recurse(grid, index + 1, locked, equalPairs, unequalPairs)
        if (e.length) {
            console.log("ee", e, eqs, grid)
            if (eqs.filter(el => el != eqs[0]).length) {
                console.log("Eq", index)
                return false
            }
            eqvalue = eqs[0]
        }
        if (un.length) {
            console.log("un", un, uneqs, grid)
            if (uneqs.filter(el => el != uneqs[0]).length) {
                console.log("Uneq", index)
                return false
            }
            uneqvalue = uneqs[0]
        }
        if (both) {
            if (eqvalue === uneqvalue) {
                console.log("conflict", index)
                return false
            }
            grid[index] = eqvalue
        }
        else if (eqvalue) {
            grid[index] = eqvalue
        }
        else if (uneqvalue) {
            grid[index] = !(uneqvalue - 1) + 1
        }
        if (either) {
            if (recurse(grid, index + 1, locked, equalPairs, unequalPairs)) return true
            else {
                console.log(index)
                grid[index] = 0
                return false
            }
        }


        for (let i of [1, 2]) {
            grid[index] = i
            let r = getRow(grid, index)
            let c = getCol(grid, index)
            if (together(r, i) || together(c, i) || unequallyFilled(r, 2, 1) || unequallyFilled(c, 2, 1)) {
                console.log(together(r, i), together(c, i), unequallyFilled(r, 2, 1), unequallyFilled(c, 2, 1), r, c, i, index)
                for (let i = 0; i < 6; i++) console.log(grid.slice(6 * i, 6 * (i + 1)))
            }
            else if (recurse(grid, index + 1, locked, equalPairs, unequalPairs)) return true
        }
        console.log(index)
        grid[index] = 0
        return false
    }

    fetchGridData().then((data) => {
        const [gridElement, grid, equalPairs, unequalPairs] = data
        console.log(grid, equalPairs, unequalPairs)
        const locked = grid.map((e, i) => [e, i]).filter(e => e[0]).map(e => e[1])
        console.log(locked)
        const result = recurse(grid, 0, locked, equalPairs, unequalPairs)
        grid.forEach((val, index) => {
            for (let i = 0; i < val; i++) click(gridElement[index])
        })
        return result.toString() + grid.toString()
    })
}
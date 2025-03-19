window.onload = function() {
    const start = document.getElementById('start')
    start.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
            let activeTab = tabs[0];
            let activeTabId = activeTab.id;

            return chrome.scripting.executeScript({
                target: {tabId: activeTabId},
                func: solver
            })
        }).then((result) => {
            document.getElementById('result').innerHTML = result[0].result
        })
        start.style.disabled = true;
    })
}

function triggerMouseEvent (node, eventType) {
    let clickEvent = new Event(eventType, { bubbles: true, cancelable: true });
    node.dispatchEvent (clickEvent);
}

function solver() {
    const iframe = document.getElementsByClassName('game-launch-page__iframe')[0].contentDocument;
    const gridElement = Array.from(iframe.getElementsByClassName('gil__grid')[0].children || document.getElementsByClassName('gil__grid')[0].children);
    let labels = gridElement.map(el => Array.from(el.children).filter(ch => ch.tagName !== "SPAN").map(ch => [ch.classList, ch.firstElementChild.ariaLabel]));
    console.log(iframe, gridElement, labels)
    for(let i = 0; i < labels.length; i++) {
        labels[i][0] = labels[i][0][1] // remove class for content
        for(let j = 1; j < labels[i].length; j++) // extract direction from class for edge content 
            labels[i][j] = [labels[i][j][0].toString().split('--')[1], labels[i][j][1]]
    }
    console.log(labels)
    let grid = labels.map(el => el.map(e => e[0]))
    let emptyIndex = grid.findIndex(el => el == "Empty")
    let emptyElement = gridElement[emptyIndex]
    return labels
}
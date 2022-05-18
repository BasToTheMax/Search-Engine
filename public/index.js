
const srcBtn = document.querySelector(".src-btn")
const srcBar = document.querySelector(".searchB")
srcBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (srcBar.value === null) {
        return
    } else {
        search(srcBar.value);
    }
})
function search(val) {
    window.open(`/search.html?q=${val}&page=1`);
}

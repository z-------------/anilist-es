let buttons = document.querySelectorAll("button.button-feedback");

for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", (e) => {
    let button = e.target;
    button.classList.remove("button-feedback--show");
    setTimeout(function() { button.classList.add("button-feedback--show") }, 0);
  });
}

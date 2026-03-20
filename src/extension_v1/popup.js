document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["username", "isLoggedIn"], (data) => {
    const dot = document.getElementById("statusDot");
    const name = document.getElementById("username");

    if (data.isLoggedIn) {
      dot.classList.remove("red");
      dot.classList.add("green");
      name.innerText = data.username;
    } else {
      dot.classList.add("red");
      name.innerText = "";
    }
  });
});

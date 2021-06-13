const ipc = require("electron").ipcRenderer;
const form = document.getElementById("my-form");

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const url = document.getElementById("url").value;
  if (url && url.startsWith("http")) {
    ipc.send("checkurl:url", { url });

    document.getElementById("submit").value = "...";
    document.getElementById("submit").setAttribute("disabled", "true");
  } else {
    document.getElementById("result").innerHTML = "try agian";
  }
});

ipc.on("checkurl:result", (e, data) => {
  document.getElementById("result").innerHTML = data.html;
  document.getElementById("submit").value = "check";
  document.getElementById("submit").removeAttribute("disabled");
});

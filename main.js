const { app, BrowserWindow, ipcMain } = require("electron");
const fetch = require("node-fetch");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

let mainWindow;

function creatMainWindow() {
  mainWindow = new BrowserWindow({
    title: "ctlac-gui",
    width: 800,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL(`file://${__dirname}/app/index.html`);
}

app.on("ready", creatMainWindow);

ipcMain.on("checkurl:url", (e, data) => {
  console.log("checking:");
  console.log(data);

  console.log(data.url);

  getContentFromUrl(data.url)
    .then((html) => {
      console.log(" reading content from: " + data.url);
      return getHeadersFromUrls(findLinksInHtml(html));
    })
    .then((json) => {
      console.log(" printing result from: " + data.url);
      mainWindow.webContents.send("checkurl:result", {
        html: printHtml(json, data.url),
      });
    })
    .catch((err) => {
      console.log("/ error: " + err);
      mainWindow.webContents.send("checkurl:result", {
        html: renderHtmlDocument("", data.url, err),
      });
    });
});

const cacheHeaderNames = ["cache-control", "via", "x-cache"];
const tableHeaderColumns = ["url", "msg"];
tableHeaderColumns.push(...cacheHeaderNames);

function getContentFromUrl(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((res) => {
        resolve(res.text());
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function findLinksInHtml(html) {
  const dom = new JSDOM(html);
  const nodeList = Array.from(dom.window.document.querySelectorAll("a"));

  return nodeList
    .map((nodeItem) => nodeItem.href)
    .filter((href) => href.startsWith("http"));
}

function getHeadersFromUrls(urls) {
  return Promise.all(urls.map((url) => getHeadersFromUrl(url)));
}

function getHeadersFromUrl(url) {
  return new Promise((resolve) => {
    fetch(url)
      .then((res) => {
        resolve({ url, headers: res.headers.raw(), msg: "" });
      })
      .catch((err) => {
        console.error(err);
        resolve({ url, headers: {}, msg: err });
      });
  });
}

function printHtml(json, requestedUrl) {
  let tableRows = renderTableRow(tableHeaderColumns, "th");

  json.forEach((element) => {
    const values = [element.url, element.msg];

    cacheHeaderNames.forEach((cacheHeaderName) => {
      values.push(
        element.headers[cacheHeaderName]
          ? JSON.stringify(element.headers[cacheHeaderName])
          : ""
      );
    });

    tableRows += renderTableRow(values, "td");
  });

  return renderHtmlDocument(tableRows, requestedUrl);
}

function renderTableRow(values, htmlTag) {
  const str = values
    .map((value) => "<" + htmlTag + ">" + value + "</" + htmlTag + ">")
    .join("");
  return `<tr>${str}</tr>`;
}

function renderHtmlDocument(bodyHtml, url, errorMsg) {
  
  const errorDiv = errorMsg ? "<div><b>" + errorMsg + "</b></div>" : "";
  const bodyHtmlDiv = bodyHtml
    ? `<div><table cellpadding="3" width="100%">${bodyHtml}</table> </div>`
    : "";
  const baseHtml = `
    ${errorDiv}

    ${bodyHtmlDiv}


`;
  return baseHtml;
}

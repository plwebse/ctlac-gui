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
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL(`file://${__dirname}/app/index.html`);
}

app.on("ready", creatMainWindow);

ipcMain.on("checkurl:url", (e, data) => {
  const url = data.url;
  
  getContentFromUrl(url)
    .then((html) => {
      return getHeadersFromUrls(findLinksInHtml(html));
    })
    .then((json) => {
      mainWindow.webContents.send("checkurl:result", {
        html: printHtml(json, url),
      });
    })
    .catch((err) => {      
      mainWindow.webContents.send("checkurl:result", {
        html: renderHtmlDocument("", url, err),
      });
    });
});

const cacheHeaderNames = ["cache-control", "via", "x-cache"];
const tableHeaderColumns = ["url"];
tableHeaderColumns.push(...cacheHeaderNames);
tableHeaderColumns.push("msg");

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
        resolve({ url, headers: {}, msg: err.toString() });
      });
  });
}

function printHtml(json, requestedUrl) {
  let tableRows = renderTableRow(tableHeaderColumns, "th");

  json.forEach((element) => {
    const values = [element.url];
    cacheHeaderNames.forEach((cacheHeaderName) => {
      values.push(
        element.headers[cacheHeaderName] ? JSON.stringify(element.headers[cacheHeaderName]) : ""
      );
    });

    values.push(element.msg);

    tableRows += renderTableRow(values, "td");
  });

  return renderHtmlDocument(tableRows, requestedUrl);
}

function renderTableRow(values, t) {
  const str = values
    .map((value) => `<${t}>${value}</${t}>`)
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

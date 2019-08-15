if (!window.indexedDB) {
  alert("You need indexedDB enabled browser to run this page");
}

let dbName = "quickdb";
let db;

{
  let req = indexedDB.open(dbName);
  req.onerror = console.error;
  req.onsuccess = e => {
    db = e.target.result;
    init();
  }
}

/* index.html functions */

function createCollection() {

  db.close();

  let name = document.getElementById("collectionNameInput").value;

  if (!name) return alert("Invalid name");

  let req = indexedDB.open(dbName, db.version + 1);
  req.onerror = console.error;
  req.onsuccess = () => window.location.href = "html/collection.html?coll=" + name;
  req.onupgradeneeded = e => {
    db = e.target.result;
    db.createObjectStore(name, { keyPath: "id", autoIncrement: true });
  }

}

/* collection.html functions */

function getCollectionData(nm) {
  return new Promise((resolve, reject) => {
    const req = db.transaction([nm]).objectStore(nm);
    req.onerror = reject;
    let data = [];
    req.openCursor().onsuccess = e => {
      const cur = e.target.result;
      if (cur) {
        data.push(cur.value);
        cur.continue();
      } else resolve(data);
    };
  });
}

function addAnotherName() {
  const form = Array.from(document.getElementById("createSchemaSection").children).find(d => d.tagName === "FORM");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Name";
  form.append(input);
}

function createSchema() {
  const form = Array.from(document.getElementById("createSchemaSection").children).find(d => d.tagName === "FORM");
  let data = {};

  Array.from(form.children).forEach(d => {
    if (d.tagName === "INPUT") data[d.value] = undefined;
  });

  for (let key in data) if (!key) return alert("Invalid Input");

  form.reset();

  writeData(null, data);
}

function writeData(nm = '', data = '') {

  if (!nm) nm = new URLSearchParams(window.location.search).get("coll");

  if (!data) {

    data = {};

    let addDataSection = document.getElementById("addDataSection");
    if (!addDataSection) return console.error("addDataSection not found");

    Array.from(addDataSection.children).forEach(d => {
      if (d.tagName === "INPUT") data[d.placeholder] = d.value;
    });

  }

  const req = db.transaction([nm], "readwrite").objectStore(nm).add(data);
  req.onerror = console.error;
  req.onsuccess = () => window.location.reload();

}

function removeData(nm = '', key) {

  if (!nm) nm = new URLSearchParams(window.location.search).get("coll");

  if (!key) return alert("Key not found");

  const req = db.transaction([nm], "readwrite").objectStore(nm).delete(key);
  req.onerror = console.error;
  req.onsuccess = () => window.location.reload();

}


function init() {

  const path = window.location.pathname;

  const viewSection = document.getElementById("viewSection");
  const msg = document.getElementById("msg");

  setTimeout(() => {

    if (path === "/" || path.toLowerCase() === "/quickdb/") {

      const stores = Array.from(db.objectStoreNames);

      if (stores.length === 0) {
        msg.innerText = "Create a new collection using above input";
        return;
      }

      stores.forEach(nm => {

        const coll = document.createElement("a");
        coll.setAttribute("href", "html/collection.html?coll=" + nm);
        coll.className = "collection"

        const collName = document.createTextNode(nm);
        coll.appendChild(collName);

        viewSection.appendChild(coll);

      });

    } else if (path.includes("collection.html")) {

      const nm = new URLSearchParams(window.location.search).get("coll");

      getCollectionData(nm)
        .then(data => {

          if (data.length === 0) {
            msg.innerText = "Create a new schema for your collection";
            document.getElementById("createSchemaSection").hidden = false;
            return;
          }

          const addDataSection = document.getElementById("addDataSection");
          const dataTable = document.getElementById("dataTable");
          const thead = Array.from(dataTable.children).find(d => d.tagName === "THEAD");
          const tbody = Array.from(dataTable.children).find(d => d.tagName === "TBODY");

          addDataSection.hidden = false;
          dataTable.hidden = false;

          const schema = data.splice(0, 1)[0];

          Object.keys(schema).forEach(key => {

            if (key === "id") return;

            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = key;
            addDataSection.appendChild(input);

            const th = document.createElement("th");
            const text = document.createTextNode(key);

            th.appendChild(text);
            thead.appendChild(th);

          });

          const button = document.createElement("button");
          const text = document.createTextNode("Add");
          button.appendChild(text);
          button.type = "button";
          button.addEventListener("click", () => writeData());
          addDataSection.appendChild(button);

          data.forEach(obj => {

            const tr = document.createElement("tr");

            for (let key in obj) {

              if (key === "id") continue;

              const td = document.createElement("td");
              const text = document.createTextNode(obj[key]);
              td.appendChild(text);
              tr.appendChild(td);
              tbody.appendChild(tr);

            }

            const text = document.createTextNode("delete");
            const button = document.createElement("button");
            button.appendChild(text);
            button.addEventListener("click", () => removeData('', obj.id));
            const td = document.createElement("td");
            td.appendChild(button);
            tr.appendChild(td);
            tbody.appendChild(tr);

          })

        })
        .catch(console.error);

    }

  }, 200);

};

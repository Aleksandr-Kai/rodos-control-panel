const proxyhost = "localhost:3000";
let authToken = null;

// Default credentials
const defaultLogin = "admin";
const defaultPassword = "admin";
const LOCALSTORAGE_DEVLIST = "deviceTableData";
const LOCALSTORAGE_GROUPS = "presets";
const regexIP = /([0-9]{1,3}\.){3}[0-9]{1,3}/g;

let debug = false;

let currentGroupName = "";

function isIP(str) {
    return str.match(regexIP)?.length === 1;
}

// Store tools
function getDevListStore(option) {
    const data = localStorage.getItem(LOCALSTORAGE_DEVLIST);

    if (option === "as string") return data || "";

    if (!data) return {};
    return JSON.parse(data);
}

function setDevlistStore(list) {
    if (!list) return;

    localStorage.setItem(LOCALSTORAGE_DEVLIST, JSON.stringify(list));
}

function getGroupListStore(option) {
    const data = localStorage.getItem(LOCALSTORAGE_GROUPS);

    if (option === "as string") return data || "";

    if (!data) return {};
    return JSON.parse(data);
}

function setGroupListStore(list) {
    if (!list) return;

    localStorage.setItem(LOCALSTORAGE_GROUPS, JSON.stringify(list));
}
//-------------------------------------------------------------------------------
function setLoginAndPassword(login, password) {
    document.getElementById("login").value = login;
    document.getElementById("password").value = password;
}

// Function to update authorization token
function updateAuthToken() {
    const login = document.getElementById("login").value;
    const password = document.getElementById("password").value;

    // Basic authentication (replace with your actual authentication logic)
    if (login && password) {
        const credentials = `${login}:${password}`;
        const encodedCredentials = btoa(credentials);
        authToken = `Basic ${encodedCredentials}`;
        console.log("Auth token updated:", authToken);
        // Save credentials to localStorage
        localStorage.setItem("login", login);
        localStorage.setItem("password", password);
    } else {
        authToken = null;
        console.log("Auth token cleared");
    }
}

async function setChan(ip, chan, state) {
    if (!authToken) {
        console.error("Authorization token not set.");
        alert("Пожалуйста, введите логин и пароль.");
        return { status: "Error", error: "Not authorized" };
    }

    return fetch(`http://${proxyhost}/setChan`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: authToken,
        },
        body: JSON.stringify({ ip, chan, state }),
    }).then((resp) => {
        if (!resp.ok) {
            console.error("setChan failed:", resp.status, resp.statusText);
            return { status: "Error", error: `HTTP error ${resp.status}` };
        }
        return resp.json();
    });
}

async function getRel(ips) {
    try {
        // Преобразование массива IP в формат для URL
        const url = `http://localhost:3000/status?${ips.map((ip) => `ip[]=${ip}`).join("&")}`;

        const response = await fetch(url, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Ошибка при получении статуса:", error);
        throw error;
    }
}

function isValidIP(ip) {
    if (!ip) return false;
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    for (const part of parts) {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 0 || num > 255) return false;
    }
    return true;
}

function createTableRow(deviceName = "", ipAddress = "", channel = 1, status = "off", checkboxChecked = false) {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = deviceName;
    nameInput.addEventListener("input", () => {
        saveTableData();
    });
    nameCell.appendChild(nameInput);
    row.appendChild(nameCell);

    const ipCell = document.createElement("td");
    const ipInput = document.createElement("input");
    ipInput.type = "text";
    ipInput.value = ipAddress;
    ipInput.addEventListener("input", () => {
        if (isValidIP(ipInput.value)) {
            ipInput.style.borderColor = "green";
        } else {
            ipInput.style.borderColor = "red";
        }
        saveTableData();
    });
    ipCell.appendChild(ipInput);
    row.appendChild(ipCell);

    const channelCell = document.createElement("td");
    const channelSelect = document.createElement("select");
    channelSelect.className = "channel-select";
    for (let i = 1; i <= 8; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.text = i;
        if (i === parseInt(channel, 10)) {
            option.selected = true;
        }
        channelSelect.appendChild(option);
    }
    channelSelect.addEventListener("change", () => {
        // Добавлено
        saveTableData();
    });
    channelCell.appendChild(channelSelect);
    row.appendChild(channelCell);

    const statusCell = document.createElement("td");
    statusCell.className = "status-cell"; //  Добавлено

    const statusButton = document.createElement("button");
    statusButton.className = "status-button";
    statusButton.textContent = "Проверка";

    statusButton.addEventListener("click", () => {
        const ip = row.cells[1].getElementsByTagName("input")[0].value;
        const channel = parseInt(row.cells[2].getElementsByTagName("select")[0].value, 10) - 1;
        const newState = statusButton.classList.contains("on") ? 0 : 1;

        statusButton.textContent = "Обработка";
        statusButton.classList.remove("on", "off");
        statusButton.classList.add("processing");
        statusButton.disabled = true;

        setChan(ip, channel, newState)
            .then((res) => {
                statusButton.classList.remove("processing");
                if (res.status === "Success") {
                    statusButton.classList.add(newState ? "on" : "off");
                    statusButton.textContent = newState ? "Работает" : "Выключено";
                } else {
                    statusButton.textContent = "Ошибка";
                    console.error(`Error calling setChan for ${ip}[${channel}]:`, res.error);
                }
                statusButton.disabled = false;
                statusButton.dataset.updated = Date.now();
            })
            .catch((err) => console.log(err));
    });
    statusCell.appendChild(statusButton);

    // Добавляем чекбокс
    const statusCheckbox = document.createElement("input");
    statusCheckbox.type = "checkbox";
    statusCheckbox.className = "status-checkbox";
    statusCheckbox.checked = checkboxChecked; // Устанавливаем состояние чекбокса
    statusCheckbox.addEventListener("change", () => {
        saveTableData(); // Сохраняем состояние при изменении
        const devList = getDevListStore();
        const checkAll = document.getElementById("checkAll");
        checkAll.checked = !devList.find((dev) => !dev.checkboxChecked);
    });
    statusCell.appendChild(statusCheckbox);

    row.appendChild(statusCell);

    const deleteCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Удалить";
    deleteButton.addEventListener("click", () => {
        if (!confirm(`Удалить устройство?`)) {
            return;
        }
        row.remove();
        saveTableData();
    });
    deleteCell.appendChild(deleteButton);
    row.appendChild(deleteCell);

    return row;
}

// Функция для получения состояний всех каналов для указанного IP
function getAllChannelsStatesForIP(ip) {
    const states = Array(8).fill(0); // Инициализируем массив с состояниями всех каналов (по умолчанию 0)

    const table = document.getElementById("deviceTable");
    const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowIP = row.cells[1].getElementsByTagName("input")[0].value;
        if (rowIP === ip) {
            const channel = parseInt(row.cells[2].getElementsByTagName("select")[0].value, 10) - 1; // Индекс канала
            const statusButton = row.cells[3].getElementsByTagName("button")[0];
            const status = statusButton.classList.contains("on") ? 1 : 0; // 1 для "on", 0 для "off"
            states[channel] = status;
        }
    }

    return states;
}

function addRow(deviceName = "", ipAddress = "", channel = 1, status = "off", checkboxChecked = false, color) {
    const tableBody = document.getElementById("deviceTable").getElementsByTagName("tbody")[0];
    const newRow = createTableRow(deviceName, ipAddress, channel, status, checkboxChecked); // Передаем состояние чекбокса
    // if (color && checkboxChecked) newRow.style.backgroundColor = color;
    tableBody.appendChild(newRow);
    saveTableData();
}

function saveTableData() {
    const table = document.getElementById("deviceTable");
    const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
    const data = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row.cells[0].getElementsByTagName("input")[0].value;
        const ip = row.cells[1].getElementsByTagName("input")[0].value;
        const channel = row.cells[2].getElementsByTagName("select")[0].value;
        const statusButton = row.cells[3].getElementsByTagName("button")[0];
        const status = statusButton.classList.contains("on") ? "on" : "off";
        const checkbox = row.cells[3].querySelector(".status-checkbox");
        const checkboxChecked = checkbox ? checkbox.checked : false; // Получаем состояние чекбокса

        data.push({
            name: name,
            ip: ip,
            channel: channel,
            status: status,
            checkboxChecked: checkboxChecked, // Сохраняем состояние чекбокса
        });
    }
    setDevlistStore(data);
}

function loadTableData() {
    const devList = getDevListStore();
    devList.forEach((item) => {
        addRow(item.name, item.ip, item.channel, item.status, item.checkboxChecked); // Передаем состояние чекбокса
    });
}

// Функция для обновления состояния кнопок на основе данных getRel
function updateStatusButtons(results, timestamp) {
    const table = document.getElementById("deviceTable");
    const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const ip = row.cells[1].getElementsByTagName("input")[0].value;
        const statusButton = row.cells[3].getElementsByTagName("button")[0];

        if (statusButton.classList.contains("processing") || timestamp < statusButton.dataset.updated) {
            // Если кнопка в состоянии "Обработка", пропускаем ее обновление от getRel
            continue;
        }

        const deviceResult = results.find((result) => result.ip === ip);

        if (deviceResult && deviceResult.status === "Success" && deviceResult.response) {
            // Обновляем состояние кнопок на основе данных от getRel
            const channelSelect = row.cells[2].getElementsByTagName("select")[0];
            const selectedChannel = parseInt(channelSelect.value, 10) - 1; // Индекс выбранного канала

            const channelState = deviceResult.response[selectedChannel]; // 0 или 1

            //  Обновляем класс и текст кнопки только если это необходимо.
            if (
                (channelState === 1 && !statusButton.classList.contains("on")) ||
                (channelState === 0 && !statusButton.classList.contains("off"))
            ) {
                statusButton.classList.remove("on", "off");
                statusButton.classList.add(channelState === 1 ? "on" : "off");
                statusButton.textContent = channelState === 1 ? "Работает" : "Выключено";
            }
        } else {
            // Обработка ошибок или недоступности устройства.
            //  Например:  сделать кнопку серой и отключить ее, или отобразить сообщение об ошибке.
            statusButton.classList.remove("on", "off");
            statusButton.textContent = "Ошибка"; //  Удаляем "(Ошибка)" - состояние кнопки теперь определяется только getRel
        }
    }
}

// Функция для выполнения Long Polling
async function startLongPolling() {
    if (debug) return;
    const table = document.getElementById("deviceTable");
    const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
    const ips = [];

    for (let i = 0; i < rows.length; i++) {
        const ip = rows[i].cells[1].getElementsByTagName("input")[0].value;
        ips.push(ip);
    }

    if (ips.length === 0) {
        // Нет устройств, нечего опрашивать.
        console.log("Нет устройств для опроса.");
        return;
    }

    try {
        const timestamp = Date.now();
        const results = await getRel(ips);
        updateStatusButtons(results, timestamp);
    } catch (error) {
        console.error("Ошибка при вызове getRel:", error);
        //  Обработка ошибок.  Например:  отобразить сообщение об ошибке, остановить long polling,
        //  или попробовать повторить запрос через некоторое время.
    } finally {
        // Повторяем запрос через определенный интервал (например, 5 секунд)
        setTimeout(startLongPolling, 500); // 5 секунд
    }
}

// Функция для включения выбранных устройств
async function turnOnSelected() {
    await changeSelectedDevices(1);
}

// Функция для выключения выбранных устройств
async function turnOffSelected() {
    await changeSelectedDevices(0);
}

// Функция для изменения состояния выбранных устройств
async function changeSelectedDevices(newState) {
    const table = document.getElementById("deviceTable");
    const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
    const promises = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const checkbox = row.cells[3].querySelector(".status-checkbox");
        if (checkbox && checkbox.checked) {
            const ip = row.cells[1].getElementsByTagName("input")[0].value;
            const channel = parseInt(row.cells[2].getElementsByTagName("select")[0].value, 10) - 1;

            // Добавим обработку состояния кнопки "Проверка"
            const statusButton = row.cells[3].getElementsByTagName("button")[0];
            statusButton.textContent = "Обработка";
            statusButton.classList.remove("on", "off");
            statusButton.classList.add("processing");
            statusButton.disabled = true;

            promises.push(
                setChan(ip, channel, newState).then((res) => {
                    if (res.status === "Success") {
                        statusButton.classList.remove("processing");
                        statusButton.classList.add(newState ? "on" : "off");
                        statusButton.textContent = newState ? "Работает" : "Выключено";
                        statusButton.disabled = false;
                        statusButton.dataset.updated = Date.now(); // Обновляем timestamp
                    } else {
                        statusButton.textContent = "Ошибка";
                        console.error(`Error calling setChan for ${ip}[${channel}] during bulk change:`, res.error);
                        statusButton.classList.remove("processing");
                        statusButton.disabled = false;
                    }
                })
            );
        }
    }

    await Promise.all(promises);
    //  После завершения всех запросов  - возможно, следует обновить отображение.
}

// --- PRESET FUNCTIONS ---

function savePreset() {
    const showName = currentGroupName === "Все" || currentGroupName === "Ничего" ? "" : currentGroupName;
    const presetName = prompt("Введите название для группы:", showName);
    if (!presetName) return; // Отмена сохранения

    const table = document.getElementById("deviceTable");
    const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
    const groupColor = document.getElementById("groupColor");
    const presetData = { color: groupColor.value };

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const checkbox = row.cells[3].querySelector(".status-checkbox");
        const ip = row.cells[1].getElementsByTagName("input")[0].value;
        const chan = row.cells[2].getElementsByTagName("select")[0].value;
        if (checkbox?.checked) {
            if (!presetData[ip]) presetData[ip] = {};
            presetData[ip][chan] = checkbox.checked; // Сохраняем состояние чекбокса
        }
    }

    // Get existing presets or initialize an empty object
    let presets = getGroupListStore();
    if (presets[presetName]) {
        let replace = prompt("Группа с таким названием существует. Напишите 'заменить' чтоб сохранить изменения.");
        if (replace !== "заменить") return;

        // if (presets[presetName].color !== presetData.color) {
        //     replace = prompt(
        //         "Выбранный цвет группы отличается от текущего. Напишите 'заменить' чтоб сохранить изменения"
        //     );
        //     if (replace.toLowerCase() !== "заменить") {
        // presetData.color = presets[presetName].color;
        // alert("Цвет группы не был изменен");
        //     }
        // }
    }
    presets[presetName] = presetData;

    setGroupListStore(presets);

    // Update the preset select options
    updatePresetSelect();
    location.reload();
}

function deletePreset(groupName) {
    if (!confirm(`Удалить группу "${groupName}"?`)) {
        return;
    }

    let presets = getGroupListStore();
    delete presets[groupName];

    setGroupListStore(presets);

    updatePresetSelect();
}

function sortDeviceTableByCheckbox() {
    const table = document.getElementById("deviceTable"); // Находим таблицу по ID
    const tbody = table.querySelector("tbody"); // Берём тело таблицы (без заголовка)
    const rows = Array.from(tbody.querySelectorAll("tr")); // Получаем все строки

    // Сортируем: checked → сверху, unchecked → снизу
    rows.sort((rowA, rowB) => {
        const checkboxA = rowA.cells[3].querySelector(".status-checkbox").checked;
        const checkboxB = rowB.cells[3].querySelector(".status-checkbox").checked;

        if (checkboxA === checkboxB) return 0; // Если оба равны, порядок не меняем
        return checkboxA ? -1 : 1; // Чекбокс A отмечен? Поднимаем его
    });

    // Очищаем и перезаполняем таблицу
    tbody.innerHTML = "";
    rows.forEach((row) => tbody.appendChild(row));
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function cleanGroup(groupName) {
    const group = getGroupListStore()[groupName];
    const devList = getDevListStore();

    let updated = false;

    for (ip in group) {
        if (ip === "color") continue;
        for (channel in group[ip]) {
            const found = devList.find((dev) => dev.ip === ip && dev.channel === channel);
            if (!found) {
                console.log(`Будет удалено: ${ip}-${channel}`);
                updated = true;
                delete group[ip][channel];
                if (isEmpty(group[ip])) delete group[ip];
            }
        }
    }

    if (updated) {
        const groups = getGroupListStore();
        groups[groupName] = group;
        setGroupListStore(groups);
    }
}

function loadPreset() {
    document.getElementById("group-name-lable").textContent = currentGroupName;
    cleanGroup(currentGroupName);
    const group = getGroupListStore()[currentGroupName];
    const devList = getDevListStore();
    const groupColor = document.getElementById("groupColor");
    groupColor.value = group?.color || "black";
    const table = document.getElementById("deviceTable");
    const tbody = table.querySelector("tbody"); // Берём тело таблицы (без заголовка)
    tbody.innerHTML = "";

    devList.forEach((item) => {
        if (group) {
            const dev = group[item.ip] || {};
            item.checkboxChecked = dev[item.channel] || false;
        } else {
            if (currentGroupName === "Все") item.checkboxChecked = true;
            else item.checkboxChecked = false;
        }
    });

    if (group)
        devList.sort((devA, devB) => {
            const checkboxA = devA.checkboxChecked;
            const checkboxB = devB.checkboxChecked;

            if (checkboxA === checkboxB) return 0; // Если оба равны, порядок не меняем
            return checkboxA ? -1 : 1; // Чекбокс A отмечен? Поднимаем его
        });
    else
        devList.sort((devA, devB) => {
            const checkboxA = devA.name;
            const checkboxB = devB.name;

            if (checkboxA > checkboxB) return 0; // Если оба равны, порядок не меняем
            return checkboxA ? -1 : 1; // Чекбокс A отмечен? Поднимаем его
        });

    devList.forEach((item) => {
        addRow(item.name, item.ip, item.channel, item.status, item.checkboxChecked, group?.color); // Передаем состояние чекбокса
    });
}

function upgradeStore() {
    const devList = getDevListStore();
    const presets = getGroupListStore();
    const newPresets = {};

    localStorage.setItem("presets_backup", JSON.stringify(presets));

    for (const presetName in presets) {
        newPresets[presetName] = { color: "white" };
        for (const devKey in presets[presetName]) {
            // в пресете вместо ключа индекс устройства в devList
            const device = devList[devKey];
            if (!device) continue;
            newPresets[presetName][device.ip] = { [device.channel]: presets[presetName][devKey] };
        }
    }

    setGroupListStore(newPresets);

    console.log(`Пресеты обновлены`);
}

function tryUpgradePresets() {
    const presets = getGroupListStore();

    for (const presetName in presets) {
        for (const key in presets[presetName]) {
            if (key === "color") continue;
            if (!isIP(key)) {
                upgradeStore();
                return;
            }
        }
    }
}

function saveJsonToFile(jsonStr, filename = "data.json") {
    // 2. Создаём Blob (бинарный объект)
    const blob = new Blob([jsonStr], { type: "application/json" });

    // 3. Создаём ссылку для скачивания
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    // 4. Имитируем клик и удаляем ссылку
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function saveParams(dest) {
    if (dest == "dev") {
        const devList = getDevListStore("as string");
        saveJsonToFile(devList, "devList.json");
    } else if (dest == "grp") {
        const presets = getGroupListStore("as string");
        saveJsonToFile(presets, "presets.json");
    }
}

async function loadParams(name) {
    const fileInput = document.getElementById(name);

    // Проверка, выбран ли файл
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert("Пожалуйста, выберите файл");
        return;
    }

    const file = fileInput.files[0];

    try {
        // Асинхронная загрузка JSON
        const data = await loadJsonFromFile(file);

        if (!data) {
            throw new Error("Файл пуст или не является валидным JSON");
        }

        // Сохранение в localStorage в зависимости от типа файла
        switch (name) {
            case "fileInput":
                setDevlistStore(data);
                break;
            case "fileInputGroup":
                setGroupListStore(data);
                break;
            default:
                console.error(`Ошибка: неправильный ID элемента file (${name})`);
                return;
        }
        location.reload(); // Раскомментируйте при необходимости
        console.log("Данные успешно загружены из файла:", file.name);
    } catch (error) {
        console.error("Ошибка загрузки файла:", error);
        alert(`Не удалось загрузить данные: ${error.message}`);
    }
}

// Предполагаемая реализация функции loadJsonFromFile
async function loadJsonFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const result = JSON.parse(event.target.result);
                resolve(result);
            } catch (e) {
                reject(new Error("Неверный формат JSON"));
            }
        };

        reader.onerror = () => {
            reject(new Error("Ошибка чтения файла"));
        };

        reader.readAsText(file);
    });
}

function updatePresetSelect() {
    const groupLists = document.querySelectorAll(".group-list");

    // groupLists.forEach((list) => {
    //     list.innerHTML =
    //         `<h2 class="list-title">Группы устройств</h2>` +
    //         `<div class="group-item"><div class="group-item-name">Все</div></div>`;
    // });

    // groupLists.forEach((list) => {
    //     list.innerHTML = `<h2 class="list-title">Группы устройств</h2>`;
    // });

    groupLists.forEach((list) => {
        list.innerHTML = ``;
    });

    const presets = getGroupListStore();
    for (const presetName in presets) {
        if (presets.hasOwnProperty(presetName)) {
            const option = document.createElement("option");
            option.value = presetName;
            option.text = presetName;
        }

        groupLists.forEach((list) => {
            list.innerHTML += `<div class="group-item"><div class="group-item-name" style="background:${
                presets[presetName].color || "none"
            };"}"><span>${presetName}</span></div><div class="group-item-btn">🗶</div></div>`;
        });
    }
}

function groupSelected(event) {
    if (event.target.classList.contains("group-list")) return;
    const groupName = event.target.textContent;

    if (groupName === "🗶") {
        const deleteName = event.target.parentNode.textContent.slice(0, -2);
        deletePreset(deleteName);
        return;
    }

    if (groupName.match("🗶")) return;

    currentGroupName = groupName;
    loadPreset();
}

document.addEventListener("DOMContentLoaded", () => {
    // Load saved credentials from localStorage
    tryUpgradePresets();
    const savedLogin = localStorage.getItem("login");
    const savedPassword = localStorage.getItem("password");
    const groupLists = document.querySelectorAll(".group-list");

    groupLists.forEach((list) => {
        list.addEventListener("click", groupSelected);
    });

    if (savedLogin && savedPassword) {
        setLoginAndPassword(savedLogin, savedPassword);
    } else {
        // Set default credentials if no credentials are saved
        setLoginAndPassword(defaultLogin, defaultPassword);
        // Update and save the token with the default credentials
        updateAuthToken(); // This also saves to localStorage
    }

    loadTableData();
    updatePresetSelect();
    updateAuthToken();
    if (!debug) startLongPolling();
});

// Добавляем функцию для показа/скрытия формы
function toggleLoginForm() {
    const loginForm = document.querySelector(".login-form");
    const layout = document.querySelector(".layout");
    const footer = document.querySelector(".save-load-block");
    const body = document.querySelector("body");

    loginForm.style.display = loginForm.style.display === "block" ? "none" : "block";
    layout.style.visibility = loginForm.style.display === "block" ? "hidden" : "visible";
    footer.style.visibility = loginForm.style.display === "block" ? "hidden" : "visible";
    body.style.backgroundColor = loginForm.style.display === "block" ? "black" : "white";
}

// Добавляем функцию для "аутентификации" (сохранение данных)
function login() {
    const loginInput = document.querySelector("#login");
    const passwordInput = document.querySelector("#password");

    // Сохраняем данные в localStorage (вместо отправки на сервер)
    localStorage.setItem("login", loginInput.value);
    localStorage.setItem("password", passwordInput.value);

    updateAuthToken(); // Обновляем "токен"

    toggleLoginForm(); // Закрываем форму
}

function checkAll(event) {
    currentGroupName = event.target.checked ? "Все" : "Ничего";
    loadPreset();
}

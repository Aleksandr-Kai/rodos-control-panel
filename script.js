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

        setChanNoSecure(ip, channel, newState)
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
    });
    statusCell.appendChild(statusCheckbox);

    row.appendChild(statusCell);

    const deleteCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Удалить";
    deleteButton.addEventListener("click", () => {
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

function addRow(deviceName = "", ipAddress = "", channel = 1, status = "off", checkboxChecked = false) {
    const tableBody = document.getElementById("deviceTable").getElementsByTagName("tbody")[0];
    const newRow = createTableRow(deviceName, ipAddress, channel, status, checkboxChecked); // Передаем состояние чекбокса
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
    localStorage.setItem("deviceTableData", JSON.stringify(data));
}

function loadTableData() {
    const data = localStorage.getItem("deviceTableData");
    if (data) {
        const parsedData = JSON.parse(data);
        parsedData.forEach((item) => {
            addRow(item.name, item.ip, item.channel, item.status, item.checkboxChecked); // Передаем состояние чекбокса
        });
    }
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
        const results = await getRelNoSecure(ips);
        // const results = await getRel(ips);
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
                setChanNoSecure(ip, channel, newState).then((res) => {
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
    const presetName = prompt("Введите имя для пресета:");
    if (!presetName) return; // Отмена сохранения

    const table = document.getElementById("deviceTable");
    const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
    const presetData = {};

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const checkbox = row.cells[3].querySelector(".status-checkbox");
        if (checkbox) {
            presetData[i] = checkbox.checked; // Сохраняем состояние чекбокса
        }
    }

    // Get existing presets or initialize an empty object
    let presets = JSON.parse(localStorage.getItem("presets")) || {};
    presets[presetName] = presetData;
    localStorage.setItem("presets", JSON.stringify(presets));

    // Update the preset select options
    updatePresetSelect();
}

function deletePreset() {
    const presetSelect = document.getElementById("presetSelect");
    const selectedPreset = presetSelect.value;

    if (!selectedPreset) {
        alert("Выберите группу для удаления.");
        return;
    }

    if (!confirm(`Удалить группу "${selectedPreset}"?`)) {
        return;
    }

    let presets = JSON.parse(localStorage.getItem("presets")) || {};
    delete presets[selectedPreset];
    localStorage.setItem("presets", JSON.stringify(presets));

    updatePresetSelect();
}

function loadPreset() {
    const presetSelect = document.getElementById("presetSelect");
    const selectedPreset = presetSelect.value;

    if (!selectedPreset) {
        //  Если выбран пустой пункт, то просто ничего не делаем.
        return;
    }

    const presets = JSON.parse(localStorage.getItem("presets")) || {};
    const presetData = presets[selectedPreset];

    if (!presetData) {
        console.error("Preset data not found.");
        return;
    }

    const table = document.getElementById("deviceTable");
    const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const checkbox = row.cells[3].querySelector(".status-checkbox");
        if (checkbox && presetData.hasOwnProperty(i)) {
            checkbox.checked = presetData[i]; // Восстанавливаем состояние чекбокса
        }
    }
    saveTableData(); // Сохраняем состояния после загрузки пресета.
}

function updatePresetSelect() {
    const presetSelect = document.getElementById("presetSelect");
    // Clear existing options
    presetSelect.innerHTML = '<option value="">Выберите группу</option>';

    const presets = JSON.parse(localStorage.getItem("presets")) || {};
    for (const presetName in presets) {
        if (presets.hasOwnProperty(presetName)) {
            const option = document.createElement("option");
            option.value = presetName;
            option.text = presetName;
            presetSelect.appendChild(option);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadTableData();
    updatePresetSelect();
    startLongPolling();
});

// Добавляем функцию для показа/скрытия формы
function toggleLoginForm() {
    const loginForm = document.querySelector(".login-form");
    loginForm.style.display = loginForm.style.display === "block" ? "none" : "block";
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

async function setChanNoSecure(ip, chan, state) {
    const path = `http://${ip}/rb${chan}${state ? "n" : "f"}.cgi`;
    return fetch(path)
        .then((resp) => resp.text())
        .then((resp) => ({ status: resp }))
        .catch((err) => ({ status: "Error", response: err.message }));
}

function xmlToArray(xmlString) {
    // Создаем объект DOMParser
    const parser = new DOMParser();
    // Парсим строку XML в документ
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    const result = Array(8).fill(0); // Инициализируем массив с 0

    for (let i = 0; i < result.length; i++) {
        // Формируем нужный тег для поиска
        const tagName = `rl${i}string`;
        const element = xmlDoc.getElementsByTagName(tagName)[0];

        // Проверяем, существует ли элемент и извлекаем значение, если это так
        if (element) {
            const value = parseInt(element.textContent, 10);
            result[i] = isNaN(value) ? 0 : value; // Устанавливаем значение или 0, если NaN
        }
    }

    return result;
}

async function getRelNoSecure(ips) {
    try {
        const promises = ips.map(async (ip) => {
            const url = `http://${ip}/pstat.xml`;
            return fetch(url, { method: "GET" })
                .then((resp) => resp.text())
                .then((resp) => ({ ip, status: "Success", response: xmlToArray(resp) }));
        });

        // Ожидаем выполнения всех промисов
        const results = await Promise.all(promises);
        return results; // Можно вернуть все результаты, если это нужно
    } catch (error) {
        console.error("Ошибка при получении статуса:", error);
        throw error;
    }
}

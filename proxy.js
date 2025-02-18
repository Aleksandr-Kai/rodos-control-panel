const express = require("express");
const http = require("http");
const app = express();

function xmlToArray(xmlString) {
    const regex = /<rl(\d)string>(\d+)<\/rl\dstring>/g;
    const result = Array(8).fill(null); // Инициализируем массив с null (или 0, в зависимости от ваших предпочтений)

    let match;
    while ((match = regex.exec(xmlString)) !== null) {
        const index = parseInt(match[1], 10);
        const value = parseInt(match[2], 10);
        result[index] = value;
    }

    // Заполняем значения по умолчанию, если какие-то элементы не найдены.
    for (let i = 0; i < result.length; i++) {
        if (result[i] === null) {
            result[i] = 0; // Или другое значение по умолчанию
        }
    }

    return result;
}

app.use(express.json()); // Для парсинга JSON-тела запроса

const setChan = async (ip, chan, state, auth) => {
    try {
        // Формируем URL для изменения состояния
        const targetIp = `${ip}:80`;
        const path = `/protect/rb${chan}${state ? "n" : "f"}.cgi`;

        // Выполняем HTTP-запрос
        const result = await makeHttpRequest(targetIp, path, auth);
        return { ip, status: "Success", response: result };
    } catch (error) {
        return { ip, status: "Error", error: error.message };
    }
};

// Обработчик POST-запроса на /set
app.post("/set", async (req, res) => {
    const devices = req.body; // Массив объектов {ip, chan, state}
    const auth = req.headers.authorization;

    if (!Array.isArray(devices)) {
        return res.status(400).json({ error: "Expected an array of devices" });
    }

    const results = [];

    // Для каждого устройства выполняем запрос
    for (const device of devices) {
        const { ip, chan, state } = device;

        try {
            // Формируем URL для изменения состояния
            const targetIp = `${ip}:80`;
            const path = `/protect/rb${chan}${state ? "n" : "f"}.cgi`;

            // Выполняем HTTP-запрос
            const result = await makeHttpRequest(targetIp, path, auth);
            results.push({ ip, status: "Success", response: result });
        } catch (error) {
            results.push({ ip, status: "Error", error: error.message });
        }
    }

    // Возвращаем результаты
    res.json(results);
});

app.get("/status", async (req, res) => {
    //http://192.168.1.20/pstat.xml
    const devices = req.query.ip; // Массив объектов {ip, chan, state}
    if (!Array.isArray(devices)) {
        return res.status(400).json({ error: "Expected an array of devices" });
    }

    const results = [];

    // Для каждого устройства выполняем запрос
    for (const ip of devices) {
        try {
            // Формируем URL для изменения состояния
            const targetIp = `${ip}:80`;
            const path = `/pstat.xml`;

            // Выполняем HTTP-запрос
            const result = await makeHttpRequest(targetIp, path);
            results.push({ ip, status: "Success", response: xmlToArray(result) });
        } catch (error) {
            results.push({ ip, status: "Error", error: error.message });
        }
    }

    // Возвращаем результаты
    res.json(results);
});

app.get("/", (req, res) => {
    res.sendFile("index.html", { root: __dirname });
});

app.get("/mchp.js", (req, res) => {
    res.sendFile("mchp.js", { root: __dirname });
});

// Функция для выполнения HTTP-запроса
function makeHttpRequest(targetIp, path, auth = "Basic YWRtaW46YWRtaW4=") {
    const options = {
        hostname: targetIp.split(":")[0],
        port: targetIp.split(":")[1] || 80,
        path: path,
        method: "GET",
        headers: {
            Authorization: auth,
        },
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = "";

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                if (res.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP error! Status: ${res.statusCode}`));
                }
            });
        });

        req.on("error", (error) => {
            reject(error);
        });

        req.end();
    });
}

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

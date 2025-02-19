const proxyhost = "localhost:3000";
async function setRel(ip, states) {
    const params = states.map((state, index) => {
        return { ip: ip, chan: index, state: Boolean(state) }; // Создаем массив объектов с ip и состоянием
    });

    try {
        const response = await fetch(`http://localhost:3000/set`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(params),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Ошибка при отправке запроса:", error);
        throw error;
    }
}

async function setChan(ip, chan, state) {
    return fetch(`http://${proxyhost}/setChan`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ ip, chan, state }),
    }).then((resp) => resp.json());
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

// Пример использования:
// setRel("192.168.1.20", [1, 0, 1, 0, 1, 0, 1, 0])
//     .then((data) => {
//         console.log("Ответ от сервера:", data);
//         return getRel(["192.168.1.20"]);
//     })
//     .then((res) => console.log(JSON.stringify(res)))
//     .catch((err) => console.log(err));
// setRel("192.168.1.20", [1, 0, 1, 0, 1, 0, 1, 0, 1])
//     .then((data) => {
//         console.log("Ответ от сервера:", data);
//         return getRel(["192.168.1.20"]);
//     })
//     .then((res) => console.log(JSON.stringify(res)))
//     .catch((err) => console.log(err));

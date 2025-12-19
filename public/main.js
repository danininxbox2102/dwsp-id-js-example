
let account = {}

const requestAccount = async () => {
    const result = await fetch("/api/users/me", {
        method: "GET",
        headers: {"Content-Type": "application/json","Accept":"application/json"},
        credentials: "include"
    })

    if (!result.ok) {
        if (result.status === 401) {
            window.location.replace("/auth");
            return
        }
    }

    const response = await result.json()
    if (!response.success) {
        alert("Что-то пошло не так. не удалось получить аккаунт")
        return
    }

    account = response.account
}

const load = async () => {
    await requestAccount()

    const accInfoEl = document.getElementById("accInfoEl")

    accInfoEl.innerText = `Имя пользователя: ${account.username}
    UUID: ${account.uuid}
    Авторизован через DWSP: ${account.dwspConnected ? '✅' : '❌'}
    Аккаунт создан: ${new Date(account.createdAt)}
    `
}

load().then()

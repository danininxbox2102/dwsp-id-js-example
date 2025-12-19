const login = async (username, password) => {

    const body = {
        username: username,
        password: password,
    }

    const result = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {"Content-Type": "application/json","Accept":"application/json"},
        credentials: "include"
    })

    if (!result.ok) {
        if (result.status === 403) {
            alert("Неверный логин или пароль")
            return
        }

        alert("Что-то пошло не так. повторите попытку позже")
        return
    }

    window.location.href = "/"
}


const register = async (username, password) => {

    const body = {
        username: username,
        password: password,
    }

    const result = await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {"Content-Type": "application/json","Accept":"application/json"},
        credentials: "include"
    })

    if (!result.ok) {
        if (result.status === 409) {
            alert("Имя пользователя занято")
            return
        }

        alert("Что-то пошло не так. повторите попытку позже")
        return
    }

    window.location.href = "/"
}

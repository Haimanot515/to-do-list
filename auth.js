const API = "http://localhost:3000";

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/users?email=${email}&password=${password}`);
  const users = await res.json();

  if (users.length === 0) {
    document.getElementById("error").innerText = "Invalid credentials";
    return;
  }

  localStorage.setItem("user", JSON.stringify(users[0]));
  window.location.href = "index.html";
}

function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

function protectPage() {
  if (!localStorage.getItem("user")) {
    window.location.href = "login.html";
  }
}

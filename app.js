const API_URL = "http://localhost:3000/tasks";
//DOM ELEMENTS
const todosSection = document.getElementById("todos");
const searchInput = document.getElementById("searchInput");
const paginationDiv = document.getElementById("pagination");

window.addEventListener('DOMContentLoaded', () => {
  protectPage();
  loadTodos();
  setupAddTask();
});
//  AUTH 
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}
function protectPage() {
  if (!localStorage.getItem("user")) window.location.href = "login.html";
}
//  TASK DATA 
let allTasks = [];
let currentPage = 1;
const tasksPerPage = 6;
// LOAD TASKS
async function loadTodos() {
  if(todosSection) todosSection.innerHTML = "<p>Loading tasks...</p>";
  try {
    const res = await fetch(API_URL);
    if(!res.ok) throw new Error("Failed to fetch tasks.");
    let tasks = await res.json();

    if(searchInput){
      const query = searchInput.value.toLowerCase();
      if(query){
        tasks = tasks.filter(t =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
        );
      }
    }
    tasks.sort((a,b) => (a.order||0) - (b.order||0));
    allTasks = tasks;
    displayTasks();
  } catch(err){
    if(todosSection) todosSection.innerHTML = "<p>Error loading tasks.</p>";
    console.error(err);
  }
}
//DISPLAY TASKS 
function displayTasks() {
  if(!todosSection) return;

  const start = (currentPage-1)*tasksPerPage;
  const end = start + tasksPerPage;
  const tasksToShow = allTasks.slice(start, end);

  if(tasksToShow.length === 0){
    todosSection.innerHTML = "<p>No tasks available.</p>";
    if(paginationDiv) paginationDiv.innerHTML = "";
    return;
  }
  todosSection.innerHTML = "";

  tasksToShow.forEach(task => {
    const taskCard = document.createElement("div");
    taskCard.classList.add("task-card", task.status==="completed"?"completed":"not-completed");

    taskCard.innerHTML = `
      <h3>${task.title}</h3>
      <p>${task.description}</p>
      <p>Category: ${task.category || 'N/A'}</p>
      <p>Due: ${task.dueDate || 'N/A'}</p>
      <p>Status: <span>${task.status}</span></p>
      <div class="buttons">
        <button class="edit">Edit</button>
        <button class="delete">Delete</button>
        <button class="toggle">Toggle Status</button>
      </div>
    `;
    todosSection.appendChild(taskCard);

    taskCard.querySelector(".edit").addEventListener("click", () => editTask(task.id));
    taskCard.querySelector(".delete").addEventListener("click", () => deleteTask(task.id));
    taskCard.querySelector(".toggle").addEventListener("click", () => toggleStatus(task.id));
  });
  setupPagination();
  setupDragAndDrop();
}
//  NAVBAR & THEME 
function setupNavbar() {
  const themeToggleBtn = document.getElementById('themeToggle');
  if(themeToggleBtn){
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark', currentTheme === 'dark');
    themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const theme = document.body.classList.contains('dark') ? 'dark' : 'light';
      localStorage.setItem('theme', theme);
      themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
  }

  const logoutBtn = document.querySelector('.nav-right button[onclick="logout()"]');
  if(logoutBtn){
    logoutBtn.addEventListener('click', logout);
  }
}

// PAGINATION 
function setupPagination() {
  if(!paginationDiv) return;

  const totalPages = Math.ceil(allTasks.length / tasksPerPage);
  paginationDiv.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Prev";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => { currentPage--; displayTasks(); };
  paginationDiv.appendChild(prevBtn);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.disabled = currentPage === totalPages || totalPages===0;
  nextBtn.onclick = () => { currentPage++; displayTasks(); };
  paginationDiv.appendChild(nextBtn);
}

// DRAG AND DROP 
function setupDragAndDrop() {
  if(!todosSection || typeof Sortable === "undefined") return;
  new Sortable(todosSection, {
    animation: 150,
    onEnd: async () => {
      const items = Array.from(todosSection.children);
      for(let i = 0; i < items.length; i++){
        const taskId = allTasks[(currentPage-1)*tasksPerPage + i].id;
        await fetch(`${API_URL}/${taskId}`,{
          method:"PATCH",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ order: (currentPage-1)*tasksPerPage + i + 1 })
        });
      }
      loadTodos();
    }
  });
}
// Edit TASK OPERATIONS
async function editTask(id){
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if(!res.ok) throw new Error("Task not found");
    const task = await res.json();
    const newTitle = prompt("Edit Title:", task.title);
    const newDesc = prompt("Edit Description:", task.description);
    const newCat = prompt("Edit Category:", task.category);
    const newDue = prompt("Edit Due Date:", task.dueDate);
    if(!newTitle||!newDesc||!newCat||!newDue){ alert("All fields required"); return; }
    await fetch(`${API_URL}/${id}`,{
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({...task, title:newTitle, description:newDesc, category:newCat, dueDate:newDue})
    });
    loadTodos();
  } catch(err){ console.error(err); alert("Error editing task"); }
}

async function deleteTask(id){
  if(!confirm("Are you sure?")) return;
  try {
    const res = await fetch(`${API_URL}/${id}`, { method:"DELETE" });
    if(!res.ok) throw new Error("Delete failed");
    loadTodos();
  } catch(err){ console.error(err); alert("Error deleting task"); }
}

async function toggleStatus(id){
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if(!res.ok) throw new Error("Task not found");
    const task = await res.json();
    await fetch(`${API_URL}/${id}`,{
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({...task, status: task.status==="completed"?"not completed":"completed"})
    });
    loadTodos();
  } catch(err){ console.error(err); alert("Error toggling status"); }
}

//  SEARCH 
if(searchInput){
  searchInput.addEventListener("input", () => { currentPage = 1; loadTodos(); });
}

// ADD TASK
function setupAddTask() {
  const addBtn = document.getElementById("addBtn");
  if (!addBtn) return;

  addBtn.addEventListener("click", async () => {
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const category = document.getElementById("category").value.trim();
    const dueDate = document.getElementById("dueDate").value;

    if (!title || !description || !category || !dueDate) {
      alert("All fields are required.");
      return;
    }

    const maxOrder = allTasks.length ? Math.max(...allTasks.map(t => t.order || 0)) : 0;

    const newTask = {
      title,
      description,
      category,
      dueDate,
      status: "not completed",
      order: maxOrder + 1
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask)
      });
      if (!res.ok) throw new Error("Failed to add task");

      alert("Task added successfully!");
      document.getElementById("title").value = "";
      document.getElementById("description").value = "";
      document.getElementById("category").value = "";
      document.getElementById("dueDate").value = "";
      loadTodos();
    } catch (err) {
      console.error(err);
      alert("Error adding task");
    }
  });
}


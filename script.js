/* ================= GLOBAL STATE ================= */
let revisionTasks = JSON.parse(localStorage.getItem("tasks")) || [];
let moduleData = [];
let gradeGoal = "2:1";

let modules = JSON.parse(localStorage.getItem("modules")) || [];

/* ================= STORAGE ================= */
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(revisionTasks));
}

/* ================= ELEMENT REFERENCES ================= */
const calendar = document.getElementById("calendar");
const monthYear = document.getElementById("month-year");

const taskNameInput = document.getElementById("task-name");
const taskDateInput = document.getElementById("task-date");
const taskModuleInput = document.getElementById("task-module");
const taskTypeInput = document.getElementById("task-type");
const taskFormError = document.getElementById("task-form-error");

const overdueList = document.getElementById("overdue-task-list");
const upcomingList = document.getElementById("upcoming-deadline-list");

const timerDisplay = document.getElementById("timer-display");
const timerSound = document.getElementById("timer-sound");

/* ================= DATE ================= */
const today = new Date().toISOString().split("T")[0];
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

/* ================= INIT ================= */
loadCalendar();
loadJSONTasks();
renderTaskList();
renderTasksOnCalendar();
updateNotifications();

/* ================= LOAD MODULES ================= */
function loadModules() {
    const taskModules = revisionTasks.map(t => t.module);

    const allModules = [...new Set([
        ...modules,
        ...taskModules
    ])];

    taskModuleInput.innerHTML = `
        <option value="">Select module</option>
        <option value="__add_new__">+ Add new module</option>
    `;

    allModules.forEach(module => {
        const option = document.createElement("option");
        option.value = module;
        option.textContent = module;
        taskModuleInput.appendChild(option);
    });

    modules = allModules;
    localStorage.setItem("modules", JSON.stringify(modules));
}

/* ================= MODULE ADD ================= */
taskModuleInput.addEventListener("change", () => {
    if (taskModuleInput.value === "__add_new__") {

        const newModule = prompt("Enter module name:");

        if (!newModule || !newModule.trim()) {
            taskModuleInput.value = "";
            return;
        }

        const cleanedModule = newModule.trim();

        if (!modules.includes(cleanedModule)) {
            modules.push(cleanedModule);
            localStorage.setItem("modules", JSON.stringify(modules));
        }

        loadModules();
        taskModuleInput.value = cleanedModule;
    }
});

/* ================= LOAD JSON ================= */
function loadJSONTasks() {
    fetch("assessments.json")
        .then(res => res.json())
        .then(data => {

            if (!localStorage.getItem("jsonLoaded")) {
                revisionTasks = [...revisionTasks, ...data];
                localStorage.setItem("jsonLoaded", "true");
                saveTasks();
            }

            loadModules(); 

            renderTaskList();
            renderTasksOnCalendar();
            updateNotifications();
        })
        .catch(() => console.warn("assessments.json not found"));
}

/* ================= CALENDAR ================= */
function loadCalendar(month = currentMonth, year = currentYear) {
    calendar.innerHTML = "";

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    monthYear.textContent = new Date(year, month).toLocaleString("default", {
        month: "long",
        year: "numeric"
    });

    ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].forEach(day => {
        const d = document.createElement("div");
        d.classList.add("day","header-cell");
        d.textContent = day;
        calendar.appendChild(d);
    });

    const firstDayIndex = (firstDay.getDay() + 6) % 7;

    for (let i = 0; i < firstDayIndex; i++) {
        calendar.appendChild(document.createElement("div")).classList.add("day","blank");
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateString = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const cell = document.createElement("div");

        cell.classList.add("day","date");
        if (dateString === today) cell.classList.add("today");

        cell.setAttribute("data-date", dateString);
        cell.innerHTML = `<strong>${d}</strong><div class="tasks"></div>`;

        calendar.appendChild(cell);
    }

    const totalCells = firstDayIndex + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;

    for (let i = 0; i < remainingCells; i++) {
        calendar.appendChild(document.createElement("div")).classList.add("day","blank");
}

    renderTasksOnCalendar();
}

/* ================= MONTH NAV ================= */
document.getElementById("prev-month").onclick = () => {
    currentMonth = (currentMonth + 11) % 12;
    if (currentMonth === 11) currentYear--;
    loadCalendar();
};

document.getElementById("next-month").onclick = () => {
    currentMonth = (currentMonth + 1) % 12;
    if (currentMonth === 0) currentYear++;
    loadCalendar();
};

/* ================= ADD TASK ================= */
document.getElementById("task-form").addEventListener("submit", e => {
    e.preventDefault();
    addTask();
});

function addTask() {
    const task = {
        assessmentName: taskNameInput.value.trim(),
        type: taskTypeInput.value,
        module: taskModuleInput.value,
        deadline: taskDateInput.value
    };

    taskFormError.textContent = "";

    if (!task.assessmentName || !task.deadline || !task.module || !task.type) {
        return showError("Please fill in all required fields.");
    }

    revisionTasks.push(task);
    saveTasks();

    document.getElementById("task-form").reset();

    loadModules(); 

    renderTaskList();
    renderTasksOnCalendar();
    updateNotifications();
}

function showError(msg) {
    taskFormError.textContent = msg;
}

/* ================= TASK LIST ================= */
function renderTaskList() {
    const container = document.getElementById("task-list");
    container.innerHTML = "";

    revisionTasks
        .sort((a,b) => a.deadline.localeCompare(b.deadline))
        .forEach((task, index) => {

            const card = document.createElement("div");
            card.classList.add("task-card");

            const typeLabel = task.type === "exam" ? "Exam" : "Coursework";

            card.innerHTML = `
                <h4>${task.assessmentName}</h4>
                <h5>${task.module}</h5>
                <h5>${typeLabel}</h5>
                <h5>Due: ${formatDate(task.deadline)}</h5>
                <button class="delete-btn" data-index="${index}">Delete</button>
            `;

            container.appendChild(card);
        });

    addDeleteListeners();
}

/* ================= DELETE ================= */
function addDeleteListeners() {
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.onclick = () => {
            const index = btn.getAttribute("data-index");

            revisionTasks.splice(index, 1);
            saveTasks();

            renderTaskList();
            renderTasksOnCalendar();
            updateNotifications();
        };
    });
}

/* ================= CALENDAR TASKS ================= */
function renderTasksOnCalendar() {
    document.querySelectorAll(".tasks").forEach(t => t.innerHTML = "");

    revisionTasks.forEach(task => {
        const cell = document.querySelector(`.day[data-date="${task.deadline}"]`);
        if (cell) {
            const div = document.createElement("div");
            div.classList.add("task");
            div.textContent = task.assessmentName;
            cell.querySelector(".tasks").appendChild(div);
        }
    });
}

/* ================= NOTIFICATIONS ================= */
function updateNotifications() {
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);

    overdueList.innerHTML = "";
    upcomingList.innerHTML = "";

    revisionTasks.forEach(task => {
        const dueDate = new Date(task.deadline);

        if (dueDate < todayDate) {
            overdueList.innerHTML += `<li>${task.assessmentName}</li>`;
        } else {
            upcomingList.innerHTML += `<li>${task.assessmentName}</li>`;
        }
    });
}

/* ================= TIMER ================= */
let timerInterval = null;
let remainingSeconds = 0;

document.getElementById("timer-start").onclick = startTimer;

document.getElementById("timer-pause").onclick = () => {
    clearInterval(timerInterval);
    timerInterval = null;
};

document.getElementById("timer-reset").onclick = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    remainingSeconds = 0;
    timerDisplay.textContent = "00:00";
};

function startTimer() {
    if (timerInterval) return;

    if (!remainingSeconds) {
        remainingSeconds = parseInt(document.getElementById("timer-length").value) * 60;
    }

    timerInterval = setInterval(() => {
        remainingSeconds--;
        updateTimerDisplay();

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            if (timerSound) timerSound.play();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = String(Math.floor(remainingSeconds / 60)).padStart(2,"0");
    const s = String(remainingSeconds % 60).padStart(2,"0");
    timerDisplay.textContent = `${m}:${s}`;
}

/* ================= UTIL ================= */
function formatDate(date) {
    return new Date(date).toLocaleDateString("en-GB");
}
/*----- Global State */
let revisionTasks = [];
let moduleData = [];
let userMarks = {};
let gradeGoal = "2:1";

/*----- Element References */
const calendar = document.getElementById("calendar");
const monthYear = document.getElementById("month-year");

const taskNameInput = document.getElementById("task-name");
const taskDateInput = document.getElementById("task-date");
const taskDescriptionInput = document.getElementById("task-description");
const taskUrlInput = document.getElementById("task-url");
const taskModuleInput = document.getElementById("task-module");
const taskTypeInput = document.getElementById("task-type");
const taskCompletionInput = document.getElementById("task-completion-date");
const taskFormError = document.getElementById("task-form-error");

const overdueList = document.getElementById("overdue-task-list");
const upcomingList = document.getElementById("upcoming-deadline-list");

const gradeModuleSelect = document.getElementById("grade-module");
const gradeComponentSelect = document.getElementById("grade-component");
const gradeMarkInput = document.getElementById("grade-mark");
const gradeFormError = document.getElementById("grade-form-error");

const moduleGradesBody = document.getElementById("module-grades-body");
const componentGradesBody = document.getElementById("component-grades-body");

const overallAverageDisplay = document.getElementById("overall-average");
const targetRangeDisplay = document.getElementById("target-range");
const goalStatusDisplay = document.getElementById("goal-status");
const progressBar = document.getElementById("overall-progress-bar");

const timerDisplay = document.getElementById("timer-display");
const timerSound = document.getElementById("timer-sound");

/*----- Date helpers */
const today = new Date().toISOString().split("T")[0];
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

/*----- Init */
loadCalendar();

/*----- Load modules */
fetch("modules.json")
    .then(res => res.json())
    .then(data => {
        moduleData = data.modules;
        populateModuleDropdowns();
        updateNotifications();
        updateModuleTable();
    })
    .catch(() => console.warn("modules.json not found"));

/*----- Dropdowns */
function populateModuleDropdowns() {
    moduleData.forEach(mod => {
        const opt = document.createElement("option");
        opt.value = mod.code;
        opt.textContent = `${mod.code} – ${mod.name}`;
        taskModuleInput.appendChild(opt);
        gradeModuleSelect.appendChild(opt.cloneNode(true));
    });
}

/*----- Calendar */
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

    renderTasksOnCalendar();
}

/*----- Month buttons */
document.getElementById("prev-month").onclick = () => {
    currentMonth = (currentMonth + 11) % 12;
    if (currentMonth === 11) currentYear--;
    loadCalendar(currentMonth, currentYear);
};

document.getElementById("next-month").onclick = () => {
    currentMonth = (currentMonth + 1) % 12;
    if (currentMonth === 0) currentYear++;
    loadCalendar(currentMonth, currentYear);
};

/*----- Add Task */
document.getElementById("task-form").addEventListener("submit", e => {
    e.preventDefault();
    addTask();
});

function addTask() {
    const task = {
        name: taskNameInput.value.trim(),
        desc: taskDescriptionInput.value.trim(),
        url: taskUrlInput.value.trim(),
        module: taskModuleInput.value,
        type: taskTypeInput.value,
        due: taskDateInput.value,
        completed: taskCompletionInput.value
    };

    taskFormError.textContent = "";

    if (!task.name || !task.desc || !task.due || !task.module || !task.type) {
        return showError("Please fill in all required fields.");
    }

    if (task.name.length < 3) {
        return showError("Task name must be at least 3 characters.");
    }

    if (/<\/?[a-z][\s\S]*>/i.test(task.desc)) {
        return showError("Description cannot contain HTML.");
    }

    if (task.url) {
        try { new URL(task.url); }
        catch { return showError("Please enter a valid URL."); }
    }

    const todayDate = new Date(today);
    const dueDate = new Date(task.due);

    if (dueDate < todayDate) {
        return showError("Due date cannot be in the past.");
    }

    if (task.completed) {
        const completedDate = new Date(task.completed);
        if (completedDate < dueDate) {
            return showError("Completion date cannot be before due date.");
        }
    }

    revisionTasks.push(task);

    document.getElementById("task-form").reset();

    renderTaskList();
    renderTasksOnCalendar();
    updateNotifications();
}

function showError(msg) {
    taskFormError.textContent = msg;
}

/*----- Task List */
function renderTaskList() {
    const container = document.getElementById("task-list");
    container.innerHTML = "";

    revisionTasks
        .sort((a,b) => a.due.localeCompare(b.due))
        .forEach(task => {
            const card = document.createElement("div");
            card.classList.add("task-card");

            card.innerHTML = `
                <h4>${task.name}</h4>
                <h5>${task.module} • ${task.type}</h5>
                <h5>Due: ${formatDate(task.due)}</h5>
                <p>${task.desc}</p>
                ${task.url ? `<a href="${task.url}" target="_blank">Resource</a>` : ""}
            `;

            container.appendChild(card);
        });
}

/*----- Calendar Tasks */
function renderTasksOnCalendar() {
    document.querySelectorAll(".tasks").forEach(t => t.innerHTML = "");

    revisionTasks.forEach(task => {
        const cell = document.querySelector(`.day[data-date="${task.due}"]`);
        if (cell) {
            const div = document.createElement("div");
            div.classList.add("task");
            div.textContent = task.name;
            cell.querySelector(".tasks").appendChild(div);
        }
    });
}

/*----- Notifications */
function updateNotifications() {
    const now = new Date();
    const upcomingLimit = new Date();
    upcomingLimit.setDate(now.getDate() + 30);

    overdueList.innerHTML = "";
    upcomingList.innerHTML = "";

    revisionTasks.forEach(task => {
        const dueDate = new Date(task.due);

        if (task.due < today) {
            overdueList.innerHTML += `<li>${task.name} (${formatDate(task.due)})</li>`;
        }

        if (dueDate >= now && dueDate <= upcomingLimit) {
            upcomingList.innerHTML += `<li>${task.name} – ${formatDate(task.due)}</li>`;
        }
    });
}

/*----- Timer */
let timerInterval = null;
let remainingSeconds = 0;

document.getElementById("timer-start").onclick = startTimer;
document.getElementById("timer-pause").onclick = () => clearInterval(timerInterval);
document.getElementById("timer-reset").onclick = () => {
    clearInterval(timerInterval);
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
            timerSound.play();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = String(Math.floor(remainingSeconds / 60)).padStart(2,"0");
    const s = String(remainingSeconds % 60).padStart(2,"0");
    timerDisplay.textContent = `${m}:${s}`;
}

/*----- Helper */
function formatDate(date) {
    return new Date(date).toLocaleDateString("en-GB");
}
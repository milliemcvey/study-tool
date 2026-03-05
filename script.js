/*----- Global State */
let revisionTasks = [];
let moduleData = [];
let userMarks = {};
let gradeGoal = "2:1";

/*----- Element References (your originals kept) */
const calendar = document.getElementById("calendar");
const monthYear = document.getElementById("month-year");
const addTaskBtn = document.getElementById("add-task");
const taskNameInput = document.getElementById("task-name");
const taskDateInput = document.getElementById("task-date");

/*----- Additional references for full functionality */
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

/*----- Load calendar immediately */
loadCalendar();

/*----- Load JSON after calendar loads */
fetch("modules.json")
    .then(res => res.json())
    .then(data => {
        moduleData = data.modules;
        populateModuleDropdowns();
        updateNotifications();
        updateModuleTable();
    })
    .catch(() => console.warn("modules.json not found — calendar still loads"));

/*----- Populate dropdowns */
function populateModuleDropdowns() {
    moduleData.forEach(mod => {
        const opt1 = document.createElement("option");
        opt1.value = mod.code;
        opt1.textContent = `${mod.code} – ${mod.name}`;
        taskModuleInput.appendChild(opt1);

        const opt2 = opt1.cloneNode(true);
        gradeModuleSelect.appendChild(opt2);
    });
}

/*----- FR1: Calendar Display */
function loadCalendar(month = currentMonth, year = currentYear) {
    calendar.innerHTML = "";

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    monthYear.textContent = new Date(year, month).toLocaleString("default", {
        month: "long",
        year: "numeric"
    });

    /*----- Weekday headers */
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(day => {
        const header = document.createElement("div");
        header.classList.add("day", "header-cell");
        header.textContent = day;
        calendar.appendChild(header);
    });

    /*----- Blank cells before month starts */
    const firstDayIndex = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < firstDayIndex; i++) {
        const blank = document.createElement("div");
        blank.classList.add("day", "blank");
        calendar.appendChild(blank);
    }

    /*----- Actual days */
    for (let d = 1; d <= daysInMonth; d++) {
        const paddedMonth = String(month + 1).padStart(2, "0");
        const paddedDay = String(d).padStart(2, "0");
        const dateString = `${year}-${paddedMonth}-${paddedDay}`;

        const cell = document.createElement("div");
        cell.classList.add("day", "date");
        if (dateString === today) cell.classList.add("today");

        cell.setAttribute("data-date", dateString);
        cell.innerHTML = `<strong>${d}</strong><div class="tasks"></div>`;

        calendar.appendChild(cell);
    }
    /*----- Fill the bottom row so the calendar is always complete */
    const totalCells = firstDayIndex + daysInMonth;
    const remainingCells = totalCells % 7;

    if (remainingCells !== 0) {
        const blanksToAdd = 7 - remainingCells;
        for (let i = 0; i < blanksToAdd; i++) {
            const blank = document.createElement("div");
            blank.classList.add("day", "blank");
            calendar.appendChild(blank);
        }
    }
        renderTasksOnCalendar();
    }

/*----- MONTH SWITCHING BUTTONS (your missing feature) */
document.getElementById("prev-month").addEventListener("click", () => {
    currentMonth--;

    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }

    loadCalendar(currentMonth, currentYear);
});

document.getElementById("next-month").addEventListener("click", () => {
    currentMonth++;

    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    loadCalendar(currentMonth, currentYear);
});

/*----- FR2: Add Revision Task */
document.getElementById("task-form").addEventListener("submit", e => {
    e.preventDefault();
    addTask();
});

function addTask() {
    const name = taskNameInput.value.trim();
    const desc = taskDescriptionInput.value.trim();
    const url = taskUrlInput.value.trim();
    const module = taskModuleInput.value;
    const type = taskTypeInput.value;
    const due = taskDateInput.value;
    const completed = taskCompletionInput.value;

    if (!name || !desc || !due) {
        taskFormError.textContent = "Please fill in all required fields.";
        return;
    }

    if (/<[a-z][\s\S]*>/i.test(desc)) {
        taskFormError.textContent = "Description cannot contain HTML tags.";
        return;
    }

    if (due < today) {
        taskFormError.textContent = "Due date cannot be in the past.";
        return;
    }

    revisionTasks.push({ name, desc, url, module, type, due, completed });

    taskFormError.textContent = "";
    taskNameInput.value = "";
    taskDescriptionInput.value = "";
    taskUrlInput.value = "";
    taskDateInput.value = "";
    taskCompletionInput.value = "";

    renderTaskList();
    renderTasksOnCalendar();
    updateNotifications();
}

/*----- FR3: Display Tasks in Due-Date Order */
function renderTaskList() {
    const container = document.getElementById("task-list");
    container.innerHTML = "";

    revisionTasks
        .sort((a, b) => a.due.localeCompare(b.due))
        .forEach(task => {
            const card = document.createElement("div");
            card.classList.add("task-card");

            card.innerHTML = `
                <h4>${task.name}</h4>
                <div class="tag-container">
                    <h5 class="card-tags">${task.type}</h5>
                    <h5 class="card-tags">${task.module}</h5>
                </div>
                <h5>Due: ${formatDate(task.due)}</h5>
                <p>${task.desc}</p>
                ${task.url ? `<a href="${task.url}" target="_blank">Resource Link</a>` : ""}
            `;

            container.appendChild(card);
        });
}

/*----- Helper: Put tasks onto calendar cells */
function renderTasksOnCalendar() {
    document.querySelectorAll(".tasks").forEach(t => t.innerHTML = "");

    revisionTasks.forEach(task => {
        const cell = document.querySelector(`.day[data-date="${task.due}"]`);
        if (cell) {
            const div = document.createElement("div");
            div.classList.add("task");
            div.textContent = task.name;
            cell.querySelector(".tasks").appendChild(div);
            cell.classList.add("has-task");
        }
    });
}

/*----- FR4 & FR5: Overdue + Upcoming Notifications */
function updateNotifications() {
    const now = new Date();
    const upcomingLimit = new Date();
    upcomingLimit.setDate(now.getDate() + 30);

    overdueList.innerHTML = "";
    upcomingList.innerHTML = "";

    revisionTasks.forEach(task => {
        const dueDate = new Date(task.due);

        if (task.due < today) {
            const li = document.createElement("li");
            li.textContent = `${task.name} (due ${formatDate(task.due)})`;
            overdueList.appendChild(li);
        }

        if (dueDate >= now && dueDate <= upcomingLimit) {
            const li = document.createElement("li");
            li.textContent = `${task.name} – ${formatDate(task.due)}`;
            upcomingList.appendChild(li);
        }
    });
}

/*----- FR7: Enter Grades + Calculate Module Grades */
gradeModuleSelect.addEventListener("change", () => {
    const module = moduleData.find(m => m.code === gradeModuleSelect.value);
    gradeComponentSelect.innerHTML = "";

    module.components.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.name;
        opt.textContent = `${c.name} (${c.weight}%)`;
        gradeComponentSelect.appendChild(opt);
    });

    updateComponentTable();
});

document.getElementById("grade-form").addEventListener("submit", e => {
    e.preventDefault();
    saveMark();
});

function saveMark() {
    const moduleCode = gradeModuleSelect.value;
    const component = gradeComponentSelect.value;
    const mark = parseInt(gradeMarkInput.value);

    if (isNaN(mark) || mark < 0 || mark > 100) {
        gradeFormError.textContent = "Marks must be between 0 and 100.";
        return;
    }

    if (!userMarks[moduleCode]) userMarks[moduleCode] = {};
    userMarks[moduleCode][component] = mark;

    gradeFormError.textContent = "";
    updateComponentTable();
    updateModuleTable();
    updateGoalProgress();
}

function updateComponentTable() {
    const moduleCode = gradeModuleSelect.value;
    const module = moduleData.find(m => m.code === moduleCode);

    componentGradesBody.innerHTML = "";

    module.components.forEach(c => {
        const mark = userMarks[moduleCode]?.[c.name] ?? "--";
        const weighted = mark === "--" ? "--" : ((mark * c.weight) / 100).toFixed(1);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${c.name}</td>
            <td>${c.weight}%</td>
            <td>${mark}</td>
            <td>${weighted}</td>
        `;
        componentGradesBody.appendChild(row);
    });
}

function updateModuleTable() {
    moduleGradesBody.innerHTML = "";

    moduleData.forEach(mod => {
        let total = 0;
        let complete = true;

        mod.components.forEach(c => {
            const mark = userMarks[mod.code]?.[c.name];
            if (mark == null) complete = false;
            else total += (mark * c.weight) / 100;
        });

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${mod.code}</td>
            <td>${mod.name}</td>
            <td>${complete ? total.toFixed(1) + "%" : "--"}</td>
            <td>${complete ? "Complete" : "Incomplete"}</td>
        `;
        moduleGradesBody.appendChild(row);
    });
}

/*----- FR6: Goal Setting + Progress Feedback */
document.getElementById("grade-goal").addEventListener("change", e => {
    gradeGoal = e.target.value;
    updateGoalProgress();
});

function updateGoalProgress() {
    let total = 0;
    let count = 0;

    moduleData.forEach(mod => {
        let moduleTotal = 0;
        let complete = true;

        mod.components.forEach(c => {
            const mark = userMarks[mod.code]?.[c.name];
            if (mark == null) {
                complete = false;
            } else {
                moduleTotal += (mark * c.weight) / 100;
            }
        });

        if (complete) {
            total += moduleTotal;
            count++;
        }
    });

    if (count === 0) {
        overallAverageDisplay.textContent = "--%";
        goalStatusDisplay.textContent = "No marks entered yet.";
        progressBar.style.width = "0%";
        return;
    }

    const avg = (total / count).toFixed(1);
    overallAverageDisplay.textContent = avg + "%";

    let targetMin = 60;
    let targetMax = 69;

    if (gradeGoal === "first") { targetMin = 70; targetMax = 100; }
    if (gradeGoal === "2:2")   { targetMin = 50; targetMax = 59; }
    if (gradeGoal === "third") { targetMin = 40; targetMax = 49; }

    targetRangeDisplay.textContent = `${targetMin}–${targetMax}%`;

    progressBar.style.width = avg + "%";

    goalStatusDisplay.textContent =
        avg >= targetMin ? "You are on track!" : "Below target — keep going!";
}

/*----- FR8: Study Timer */
let timerInterval = null;
let remainingSeconds = 0;

document.getElementById("timer-start").addEventListener("click", startTimer);
document.getElementById("timer-pause").addEventListener("click", pauseTimer);
document.getElementById("timer-reset").addEventListener("click", resetTimer);

function startTimer() {
    if (timerInterval) return;

    if (remainingSeconds === 0) {
        const minutes = parseInt(document.getElementById("timer-length").value);
        remainingSeconds = minutes * 60;
    }

    timerInterval = setInterval(() => {
        remainingSeconds--;
        updateTimerDisplay();

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            timerSound.play();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    remainingSeconds = 0;
    timerDisplay.textContent = "00:00";
}

function updateTimerDisplay() {
    const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
    const secs = String(remainingSeconds % 60).padStart(2, "0");
    timerDisplay.textContent = `${mins}:${secs}`;
}

/*----- Helper: Format date */
function formatDate(date) {
    return new Date(date).toLocaleDateString("en-GB");
}
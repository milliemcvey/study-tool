/*  GLOBAL STATE  */
let revisionTasks = JSON.parse(localStorage.getItem("tasks")) || [];// Load saved tasks
let moduleData = []; // Placeholder for imported module info
let gradeGoal = "2:1"; // Default grade target
let modules = JSON.parse(localStorage.getItem("modules")) || []; // Saved modules
let grades = JSON.parse(localStorage.getItem("grades")) || []; // Saved grade entries

/*  STORAGE  */
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(revisionTasks));
}

function saveGrades() {
    localStorage.setItem("grades", JSON.stringify(grades));
}

/*  ELEMENT REFERENCES  */
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

/*  DATE  */
const today = new Date().toISOString().split("T")[0];
let currentDate = new Date();// Tracks visible calendar month
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

/*  INIT  */
loadCalendar(); // Build calendar UI
loadJSONTasks(); // Load predefined tasks (if any)
renderTaskList(); // Show tasks in sidebar
renderTasksOnCalendar(); // Add tasks to calendar days
updateNotifications(); // Refresh overdue/upcoming lists
loadGradeFormOptions(); // Populate grade dropdowns
renderModuleAverages(); // Display module grade averages


/*  LOAD MODULES  */
function loadModules() {
    const taskModules = revisionTasks.map(t => t.module); // Modules referenced by tasks

    const allModules = [...new Set([
        ...modules,
        ...taskModules
    ])]; // Merge

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

    modules = allModules; // Updates stored list
    localStorage.setItem("modules", JSON.stringify(modules));

    loadGradeFormOptions(); // Refresh grade form dropdowns
}


/*  MODULE ADD  */
taskModuleInput.addEventListener("change", () => {
    if (taskModuleInput.value === "__add_new__") {

        const newModule = prompt("Enter module name:");

        if (!newModule || !newModule.trim()) { // reset
            taskModuleInput.value = "";
            return;
        }

        const cleanedModule = newModule.trim();

        if (!modules.includes(cleanedModule)) {
            modules.push(cleanedModule); // Adds new module
            localStorage.setItem("modules", JSON.stringify(modules));
        }

        loadModules(); // dropdown
        taskModuleInput.value = cleanedModule; // Auto-selects new module
    }
});


/*  LOAD JSON  */
function loadJSONTasks() {
    fetch("assessments.json")
        .then(res => res.json())
        .then(data => {

            if (!localStorage.getItem("jsonLoaded")) { // Only imports once
                revisionTasks = [...revisionTasks, ...data];
                localStorage.setItem("jsonLoaded", "true");
                saveTasks();
            }

            loadModules(); // Syncs modules with imported tasks

            renderTaskList();
            renderTasksOnCalendar();
            updateNotifications();
        })
        .catch(() => console.warn("assessments.json not found"));
}


/*  CALENDAR  */
function loadCalendar(month = currentMonth, year = currentYear) {
    calendar.innerHTML = ""; // Clears previous month

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

    const firstDayIndex = (firstDay.getDay() + 6) % 7; // Converts Sun–Sat → Mon–Sun

    for (let i = 0; i < firstDayIndex; i++) {
        calendar.appendChild(document.createElement("div")).classList.add("day","blank");
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateString = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const cell = document.createElement("div");

        cell.classList.add("day","date");
        if (dateString === today) cell.classList.add("today"); // Highlights today

        cell.setAttribute("data-date", dateString);
        cell.innerHTML = `<strong>${d}</strong><div class="tasks"></div>`;

        calendar.appendChild(cell);
    }

    const totalCells = firstDayIndex + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7; // Fills final row

    for (let i = 0; i < remainingCells; i++) {
        calendar.appendChild(document.createElement("div")).classList.add("day","blank");
    }

    renderTasksOnCalendar(); // Adds tasks to new month
}

/*  MONTH NAV  */
document.getElementById("prev-month").onclick = () => {
    currentMonth = (currentMonth + 11) % 12; // Move back one month
    if (currentMonth === 11) currentYear--; 
    loadCalendar();
};

document.getElementById("next-month").onclick = () => {
    currentMonth = (currentMonth + 1) % 12; // Move forward one month
    if (currentMonth === 0) currentYear++; 
    loadCalendar();
};


/*  ADD TASK  */
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
        return showError("Please fill in all required fields."); // Basic validation
    }

    revisionTasks.push(task);
    saveTasks();

    document.getElementById("task-form").reset();

    loadModules(); // Refresh module dropdown
    loadGradeFormOptions();

    renderTaskList();
    renderTasksOnCalendar();
    updateNotifications();
}

function showError(msg) {
    taskFormError.textContent = msg;
}


/*  TASK LIST  */
function renderTaskList() {
    const container = document.getElementById("task-list");
    container.innerHTML = "";

    revisionTasks
        .sort((a,b) => a.deadline.localeCompare(b.deadline)) // Sort by date
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

/*  DELETE  */
function addDeleteListeners() {
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.onclick = () => {
            const index = btn.getAttribute("data-index");

            revisionTasks.splice(index, 1); // Remove task
            saveTasks();

            renderTaskList();
            renderTasksOnCalendar();
            updateNotifications();
        };
    });
}

/*  CALENDAR TASKS  */
function renderTasksOnCalendar() {
    document.querySelectorAll(".tasks").forEach(t => t.innerHTML = ""); // Clear old tasks

    revisionTasks.forEach(task => {
        const cell = document.querySelector(`.day[data-date="${task.deadline}"]`);
        if (cell) {
            const div = document.createElement("div");
            div.classList.add("task");
            div.textContent = task.assessmentName;
            cell.querySelector(".tasks").appendChild(div); // Add task to date cell
        }
    });
}

/*  NOTIFICATIONS  */
function updateNotifications() {
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0); // Compare dates at midnight

    overdueList.innerHTML = "";
    upcomingList.innerHTML = "";

    let overdueCount = 0;
    let upcomingCount = 0;

    const futureTasks = [];

    revisionTasks.forEach(task => {
        const dueDate = new Date(task.deadline);

        if (dueDate < todayDate) {
            overdueList.innerHTML += `<li>${task.assessmentName}</li>`;
            overdueCount++;
        } else {
            upcomingList.innerHTML += `<li>${task.assessmentName}</li>`;
            upcomingCount++;
            futureTasks.push(task);
        }
    });

    if (!overdueList.innerHTML) overdueList.innerHTML = "<li>No overdue tasks</li>";
    if (!upcomingList.innerHTML) upcomingList.innerHTML = "<li>Nothing coming up</li>";

    document.getElementById("total-tasks").textContent = revisionTasks.length;
    document.getElementById("overdue-count").textContent = overdueCount;
    document.getElementById("upcoming-count").textContent = upcomingCount;
}

/*  GRADES — FORM OPTIONS  */
function loadGradeFormOptions() {
    const gradeModule = document.getElementById("grade-module");
    const gradeComponent = document.getElementById("grade-component");

    gradeModule.innerHTML = `<option value="">Select module</option>`;

    modules.forEach(module => {
        const option = document.createElement("option");
        option.value = module;
        option.textContent = module;
        gradeModule.appendChild(option);
    });
    
    gradeModule.onchange = () => {
        const selectedModule = gradeModule.value;

        gradeComponent.innerHTML = `<option value="">Select component</option>`;

        revisionTasks
            .filter(t => t.module === selectedModule)
            .forEach(task => {
                const option = document.createElement("option");
                option.value = task.assessmentName;
                option.textContent = task.assessmentName;
                gradeComponent.appendChild(option);
            });
    };
}

/*  MODULE WEIGHT (if used later)  */
function getModuleTotalWeight(module) {
    return grades
        .filter(g => g.module === module)
        .reduce((sum, g) => sum + (g.weight || 0), 0);
}

/*  ADD GRADE  */
document.getElementById("add-grade").addEventListener("click", (e) => {
    e.preventDefault();

    const module = document.getElementById("grade-module").value;
    const component = document.getElementById("grade-component").value;
    const mark = parseFloat(document.getElementById("grade-mark").value);

    const error = document.getElementById("grade-form-error");
    error.textContent = "";

    if (!module || !component || isNaN(mark) || mark < 0 || mark > 100) {
        error.textContent = "Enter a valid mark (0–100).";
        return;
    }

    const existingIndex = grades.findIndex(
        g => g.module === module && g.component === component
    );

    const newGrade = { module, component, mark };

    if (existingIndex !== -1) {
        grades[existingIndex] = newGrade; // Update existing
    } else {
        grades.push(newGrade); // Add new
    }

    saveGrades();

    document.getElementById("grade-mark").value = "";

    renderModuleAverages();
    updateGoals();
});

document.getElementById("grade-module").addEventListener("change", (e) => {
    const module = e.target.value; // Currently unused
});

/*  RENDER MODULE AVERAGES  */
function renderModuleAverages() {
    const tbody = document.getElementById("module-grades-body");
    const breakdown = document.getElementById("module-breakdown");

    tbody.innerHTML = "";
    breakdown.innerHTML = "";

    const moduleMap = {};

    grades.forEach(g => {
        if (!moduleMap[g.module]) moduleMap[g.module] = [];
        moduleMap[g.module].push(g);
    });

    Object.keys(moduleMap).forEach(module => {
        const items = moduleMap[module];

        const avg = items.reduce((sum, i) => sum + i.mark, 0) / items.length;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${module}</td>
            <td>${avg.toFixed(1)}%</td>
        `;
        tbody.appendChild(row);

        const group = document.createElement("div");
        group.className = "module-group";

        group.innerHTML = `
            <h4>${module}</h4>

            ${items.map(i => `
                <div class="component-item">
                    <div>${i.component}</div>

                    <div class="component-mark">
                        ${i.mark}%
                    </div>

                    <div class="grade-actions">
                        <button type="button"
                            class="delete-grade-btn"
                            data-module="${module}"
                            data-component="${i.component}">
                            Delete
                        </button>
                    </div>
                </div>
            `).join("")}
        `;

        breakdown.appendChild(group);
    });
}
/*  DELETE GRADE  */
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-grade-btn")) {

        const module = e.target.getAttribute("data-module");
        const component = e.target.getAttribute("data-component");

        grades = grades.filter(g =>
            !(g.module === module && g.component === component)
        );

        saveGrades();
        renderModuleAverages();
    }
});

/*  GOALS  */
function updateGoals() {
    const overallAvgEl = document.getElementById("overall-average");
    const progressBar = document.getElementById("overall-progress-bar");
    const goalStatus = document.getElementById("goal-status");
    const targetRange = document.getElementById("target-range");

    if (!grades.length) {
        overallAvgEl.textContent = "0%";
        progressBar.style.width = "0%";
        goalStatus.textContent = "No grades yet";
        return;
    }

    const moduleMap = {};

    grades.forEach(g => {
        if (!moduleMap[g.module]) moduleMap[g.module] = [];
        moduleMap[g.module].push(g);
    });

    let total = 0;
    let count = 0;

    Object.values(moduleMap).forEach(items => {
        const avg = items.reduce((sum, i) => sum + i.mark, 0) / items.length;
        total += avg;
        count++;
    });

    const overallAvg = total / count;

    const targets = {
        "First": 70,
        "2:1": 60,
        "2:2": 50,
        "Third": 40
    };

    const target = targets[gradeGoal] || 60;

    overallAvgEl.textContent = `${overallAvg.toFixed(1)}%`;
    targetRange.textContent = `Target: ${gradeGoal} (${target}%)`;

    const progress = Math.min((overallAvg / target) * 100, 100);
    progressBar.style.width = `${progress}%`;

    goalStatus.textContent =
        overallAvg >= target ? "On track / above target " : "Below target";
}

document.getElementById("grade-goal").addEventListener("change", (e) => {
    gradeGoal = e.target.value;
    updateGoals();
});

/*  TIMER  */
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
        remainingSeconds =
            parseInt(document.getElementById("timer-length").value) * 60;
    }

    timerInterval = setInterval(() => {
        remainingSeconds--;
        updateTimerDisplay();

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = String(Math.floor(remainingSeconds / 60)).padStart(2,"0");
    const s = String(remainingSeconds % 60).padStart(2,"0");
    timerDisplay.textContent = `${m}:${s}`;
}

/*  UTIL  */
function formatDate(date) {
    return new Date(date).toLocaleDateString("en-GB");
}

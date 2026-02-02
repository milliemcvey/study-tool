// ---------------------- Element References ----------------------
const calendar = document.getElementById("calendar");
const monthYear = document.getElementById("month-year");
const addTaskBtn = document.getElementById("add-task");
const taskNameInput = document.getElementById("task-name");
const taskDateInput = document.getElementById("task-date");

// Today's date in YYYY-MM-DD format
const today = new Date().toISOString().split("T")[0];

// Track current month/year
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();


// ---------------------- Calendar Generator ----------------------
function loadCalendar(month = currentMonth, year = currentYear) {
    calendar.innerHTML = "";

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    monthYear.textContent = new Date(year, month).toLocaleString("default", {
        month: "long",
        year: "numeric"
    });

    // Weekday headers (Monday → Sunday)
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    weekdays.forEach(day => {
        const header = document.createElement("div");
        header.classList.add("day", "blank", "header-cell");
        header.innerHTML = `<strong>${day}</strong>`;
        calendar.appendChild(header);
    });

    // Convert JS Sunday=0 → Monday=0
    const firstDayIndex = (firstDay.getDay() + 6) % 7;

    // Add blank grey cells before the first day
    for (let i = 0; i < firstDayIndex; i++) {
        const blank = document.createElement("div");
        blank.classList.add("day", "blank");
        calendar.appendChild(blank);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const paddedMonth = String(month + 1).padStart(2, "0");
        const paddedDay = String(day).padStart(2, "0");
        const dateString = `${year}-${paddedMonth}-${paddedDay}`;

        const dayCell = document.createElement("div");
        dayCell.classList.add("day", "date"); // white by default

        if (dateString === today) {
            dayCell.classList.add("today");
        }

        dayCell.setAttribute("data-date", dateString);
        dayCell.innerHTML = `
            <strong>${day}</strong>
            <div class="tasks"></div>
        `;

        calendar.appendChild(dayCell);
    }

    // Fill bottom row with grey blanks
    const totalCells = 7 + firstDayIndex + daysInMonth;
    const remainder = totalCells % 7;

    if (remainder !== 0) {
        const blanksToAdd = 7 - remainder;
        for (let i = 0; i < blanksToAdd; i++) {
            const blank = document.createElement("div");
            blank.classList.add("day", "blank");
            calendar.appendChild(blank);
        }
    }
}


// ---------------------- Add Task to Calendar ----------------------
function addTask() {
    const taskName = taskNameInput.value.trim();
    const taskDate = taskDateInput.value;

    if (!taskName || !taskDate) return;

    const targetCell = document.querySelector(`.day[data-date="${taskDate}"]`);

    if (targetCell) {
        const taskContainer = targetCell.querySelector(".tasks");

        const taskElement = document.createElement("div");
        taskElement.classList.add("task");
        taskElement.textContent = taskName;

        taskContainer.appendChild(taskElement);

        // Mark cell as having tasks → yellow
        targetCell.classList.add("has-task");
    }

    taskNameInput.value = "";
    taskDateInput.value = "";
}


// ---------------------- Event Listeners ----------------------
addTaskBtn.addEventListener("click", addTask);

// Load calendar on page load
loadCalendar();
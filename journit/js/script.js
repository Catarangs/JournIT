/* ═══════════════════════════════════════════════════
   JOURNIT — script.js (Supabase Version - Fixed)
═══════════════════════════════════════════════════ */


/* ─────────────────────────────────────────────────
   SECTION 1 — SUPABASE CONFIGURATION
───────────────────────────────────────────────── */

const SUPABASE_URL = "https://ibgzafnozprlsrhougdt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliZ3phZm5venBybHNyaG91Z2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzM5MDUsImV4cCI6MjA5NDI0OTkwNX0.d7BfVbm4PaP0nNfJQ5wvOtSbV4_2J5aaPQHBrWCY3FA";
const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* ─────────────────────────────────────────────────
   SECTION 2 — PAGE INITIALIZATION
───────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", function() {

    let page = window.location.pathname;

    if (page.includes("signin") ||
        page.includes("signup")) {
        return;
    }

    if (page.includes("admin-account")) {
        initAdminAccountPage();
        return;
    }

    if (page.includes("admin")) {
        initAdminPage();
        return;
    }

    if (page.includes("dashboard")) {
        checkLogin();
        initDashboard();
        return;
    }

    if (page.includes("account")) {
        checkLogin();
        initAccountPage();
        return;
    }

    checkLogin();
    initHomepage();

});


/* ─────────────────────────────────────────────────
   SECTION 3 — HERO SLIDESHOW
───────────────────────────────────────────────── */

let currentSlide = 0;

function initSlideshow() {

    let slides = document.querySelectorAll(".slide");
    let dots   = document.querySelectorAll(".dot");

    if (slides.length === 0) { return; }

    dots.forEach(function(dot) {
        dot.addEventListener("click", function() {
            let index = parseInt(
                dot.getAttribute("data-index")
            );
            goToSlide(index, slides, dots);
        });
    });

    setInterval(function() {
        goToNextSlide(slides, dots);
    }, 4000);

}

function goToNextSlide(slides, dots) {
    let next = (currentSlide + 1) % slides.length;
    goToSlide(next, slides, dots);
}

function goToSlide(index, slides, dots) {
    slides[currentSlide].classList.remove("active");
    dots[currentSlide].classList.remove("active");
    currentSlide = index;
    slides[currentSlide].classList.add("active");
    dots[currentSlide].classList.add("active");
}


/* ─────────────────────────────────────────────────
   SECTION 4 — AUTHENTICATION
───────────────────────────────────────────────── */

async function signUp() {

    let username = document.getElementById(
        "username"
    ).value.trim();
    let password = document.getElementById(
        "password"
    ).value.trim();

    if (username === "" || password === "") {
        alert("Please enter both a username and password.");
        return;
    }

    let fakeEmail = username + "@journit.app";

    let { data, error } = await db.auth.signUp({
        email:    fakeEmail,
        password: password
    });

    if (error) {
        alert("Sign up failed: " + error.message);
        return;
    }

    let { error: profileError } = await db
        .from("profiles")
        .insert({
            id:              data.user.id,
            username:        username,
            role:            "user",
            completed_count: 0
        });

    if (profileError) {
        alert("Profile creation failed: " +
              profileError.message);
        return;
    }

    await db.from("admin_log").insert({
        action:  "user_registered",
        user_id: data.user.id,
        details: username
    });

    alert("Account created! Please sign in.");
    window.location.href = "signin.html";

}


async function signIn() {

    let username = document.getElementById(
        "username"
    ).value.trim();
    let password = document.getElementById(
        "password"
    ).value.trim();

    if (username === "" || password === "") {
        alert("Please enter your username and password.");
        return;
    }

    let fakeEmail = username + "@journit.app";

    let { data, error } = await db.auth.signInWithPassword({
        email:    fakeEmail,
        password: password
    });

    if (error) {
        alert("Sign in failed. " +
              "Check your username and password.");
        return;
    }

    let { data: profile } = await db
        .from("profiles")
        .select("username, role")
        .eq("id", data.user.id)
        .single();

    localStorage.setItem("userId",   data.user.id);
    localStorage.setItem("username", profile.username);
    localStorage.setItem("role",     profile.role);

    if (profile.role === "admin") {
        window.location.href = "admin.html";
    } else {
        window.location.href = "index.html";
    }

}


async function logout() {
    await db.auth.signOut();
    localStorage.clear();
    window.location.href = "signin.html";
}


function checkLogin() {
    let username = localStorage.getItem("username");
    if (!username) {
        window.location.href = "signin.html";
    }
}


/* ─────────────────────────────────────────────────
   SECTION 5 — HOMEPAGE
───────────────────────────────────────────────── */

function initHomepage() {
    initSlideshow();
    loadTrackedPlan();
}

function scrollToPlans() {
    let section = document.getElementById("plans-section");
    if (section) {
        section.scrollIntoView({ behavior: "smooth" });
    }
}

async function loadTrackedPlan() {

    let userId = localStorage.getItem("userId");

    let { data: plans } = await db
        .from("plans")
        .select("*")
        .eq("user_id", userId)
        .eq("is_tracked", true);

    if (!plans || plans.length === 0) {
        showNoPlanState();
        return;
    }

    let plan = await getFullPlan(plans[0].id);
    showActivePlanState(plan);

}

function showNoPlanState() {
    document.getElementById("no-plan-state")
            .classList.remove("hidden");
    document.getElementById("active-plan-state")
            .classList.add("hidden");
}

async function showActivePlanState(plan) {

    document.getElementById("no-plan-state")
            .classList.add("hidden");
    document.getElementById("active-plan-state")
            .classList.remove("hidden");

    document.getElementById("tracking-plan-name")
            .textContent = plan.plan_name;

    let totalBudget = 0;
    plan.days.forEach(function(day) {
        totalBudget += parseFloat(day.budget || 0);
    });

    document.getElementById("tracking-days-count")
            .textContent = plan.days.length + " Days";
    document.getElementById("tracking-budget")
            .textContent = "₱" + totalBudget.toLocaleString();

    buildTrackingDays(plan.days);
    updateProgress(plan.days);

}

function buildTrackingDays(days) {

    let container = document.getElementById("tracking-days");
    container.innerHTML = "";

    days.forEach(function(day) {

        let dateObj   = new Date(day.day_date);
        let formatted = dateObj.toLocaleDateString("en-US", {
            weekday: "short",
            month:   "short",
            day:     "numeric"
        });

        let dayDiv = document.createElement("div");
        dayDiv.className = "day-box";

        let headerRow = document.createElement("div");
        headerRow.className = "day-header-row";
        headerRow.innerHTML =
            "<span class='day-date-label'>" +
            formatted + "</span>" +
            "<span class='day-budget-badge'>₱" +
            parseFloat(day.budget || 0)
            .toLocaleString() + "</span>";
        dayDiv.appendChild(headerRow);

        day.activities.forEach(function(activity) {

            let actRow = document.createElement("div");
            actRow.className = "activity-row";

            let checkbox = document.createElement("input");
            checkbox.type      = "checkbox";
            checkbox.className = "activity-checkbox";
            checkbox.setAttribute("data-id", activity.id);
            checkbox.checked   = activity.is_done;
            checkbox.addEventListener("change", function() {
                toggleActivity(this);
            });

            let details = document.createElement("div");
            details.className = "activity-details";

            let name = document.createElement("span");
            name.className = "activity-name" +
                             (activity.is_done ? " completed" : "");
            name.textContent = activity.activity_name;

            let meta = document.createElement("div");
            meta.className = "activity-meta";
            meta.innerHTML =
                "<span class='activity-time'>" +
                (activity.activity_time || "") + "</span>" +
                "<span class='activity-location'>" +
                (activity.location || "") + "</span>";

            details.appendChild(name);
            details.appendChild(meta);
            actRow.appendChild(checkbox);
            actRow.appendChild(details);
            dayDiv.appendChild(actRow);

        });

        container.appendChild(dayDiv);

    });

}

async function toggleActivity(checkbox) {

    let activityId = checkbox.getAttribute("data-id");
    let isDone     = checkbox.checked;

    let nameSpan = checkbox.parentElement
                           .querySelector(".activity-name");
    if (isDone) {
        nameSpan.classList.add("completed");
    } else {
        nameSpan.classList.remove("completed");
    }

    await db
        .from("activities")
        .update({ is_done: isDone })
        .eq("id", activityId);

    loadTrackedPlan();

}

function updateProgress(days) {

    let totalActivities = 0;
    let doneActivities  = 0;
    let totalBudget     = 0;
    let spentBudget     = 0;

    days.forEach(function(day) {

        totalBudget += parseFloat(day.budget || 0);
        let dayDone  = true;

        day.activities.forEach(function(activity) {
            totalActivities++;
            if (activity.is_done) {
                doneActivities++;
            } else {
                dayDone = false;
            }
        });

        if (dayDone && day.activities.length > 0) {
            spentBudget += parseFloat(day.budget || 0);
        }

    });

    let percent = 0;
    if (totalActivities > 0) {
        percent = Math.round(
            (doneActivities / totalActivities) * 100
        );
    }

    document.getElementById("progress-percent")
            .textContent = percent + "%";
    document.getElementById("activities-done")
            .textContent = doneActivities;
    document.getElementById("activities-total")
            .textContent = totalActivities;
    document.getElementById("budget-spent")
            .textContent = "₱" + spentBudget.toLocaleString();
    document.getElementById("budget-total")
            .textContent = "₱" + totalBudget.toLocaleString();

}

async function stopTracking() {

    let userId = localStorage.getItem("userId");

    await db
        .from("plans")
        .update({ is_tracked: false })
        .eq("user_id", userId);

    let { data: profile } = await db
        .from("profiles")
        .select("completed_count")
        .eq("id", userId)
        .single();

    await db
        .from("profiles")
        .update({
            completed_count: (profile.completed_count || 0) + 1
        })
        .eq("id", userId);

    showNoPlanState();

}


/* ─────────────────────────────────────────────────
   SECTION 6 — DASHBOARD — PLANS GRID
───────────────────────────────────────────────── */

function initDashboard() {
    loadAllPlans();
}

async function loadAllPlans() {

    let userId = localStorage.getItem("userId");

    let { data: plans, error } = await db
        .from("plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    let grid = document.getElementById("plans-grid");
    grid.innerHTML = "";

    if (!plans || plans.length === 0) { return; }

    for (let plan of plans) {

        let { data: days } = await db
            .from("days")
            .select("budget")
            .eq("plan_id", plan.id);

        plan.days_count   = days ? days.length : 0;
        plan.total_budget = days
            ? days.reduce(function(sum, d) {
                return sum + parseFloat(d.budget || 0);
              }, 0)
            : 0;

        /* Use createElement instead of innerHTML+= */
        /* This prevents wiping user-typed data */
        let cardDiv = document.createElement("div");
        cardDiv.innerHTML = buildPlanCard(plan);
        grid.appendChild(cardDiv.firstChild);

    }

}

function buildPlanCard(plan) {

    let trackingBadge = "";
    if (plan.is_tracked) {
        trackingBadge =
            "<span class='card-tracking-badge'>" +
            "&#9679; Currently Tracking</span>";
    }

    let card  = "<div class='plan-card' ";
    card     += "data-id='" + plan.id + "' ";
    card     += "data-name='" +
                plan.plan_name.replace(/'/g, "&#39;") + "' ";
    card     += "onclick='openPlan(this)'>";

    /* Delete button — top right, shown on hover */
    card += "<button class='card-delete-btn' ";
    card += "onclick='openDeleteModal(event, " +
            plan.id + ", " +
            JSON.stringify(plan.plan_name) + ")'>";
    card += "<img src='images/warning-icon.png' ";
    card += "class='card-delete-icon' alt='Delete'>";
    card += "</button>";

    card += "<p class='plan-card-name'>" +
            plan.plan_name + "</p>";
    card += "<div class='plan-card-meta'>";
    card += "<span class='plan-card-meta-item'>" +
            plan.days_count + " Days</span>";
    card += "<span class='plan-card-meta-item'>&#8369;" +
            plan.total_budget.toLocaleString() + "</span>";
    card += "</div>";
    card += trackingBadge;
    card += "</div>";

    return card;

}


/* ─────────────────────────────────────────────────
   SECTION 7 — EXPANDED PLAN MODAL
───────────────────────────────────────────────── */

let currentOpenPlanId = null;

/* Helper: gets full plan with days and activities */
async function getFullPlan(planId) {

    let { data: plan } = await db
        .from("plans")
        .select("*")
        .eq("id", planId)
        .single();

    let { data: days } = await db
        .from("days")
        .select("*")
        .eq("plan_id", planId)
        .order("day_date", { ascending: true });

    for (let day of (days || [])) {
        let { data: activities } = await db
            .from("activities")
            .select("*")
            .eq("day_id", day.id)
            .order("id", { ascending: true });
        day.activities = activities || [];
    }

    plan.days = days || [];
    return plan;

}

async function openPlan(cardElement) {

    let planId        = cardElement.getAttribute("data-id");
    currentOpenPlanId = planId;

    let plan = await getFullPlan(planId);
    populateExpandedModal(plan);

    document.getElementById("expanded-plan-modal")
            .classList.remove("hidden");

}

function populateExpandedModal(plan) {

    document.getElementById("expanded-plan-name")
            .textContent = plan.plan_name;

    let totalBudget = 0;
    plan.days.forEach(function(day) {
        totalBudget += parseFloat(day.budget || 0);
    });

    document.getElementById("expanded-days-count")
            .textContent = plan.days.length + " Days";
    document.getElementById("expanded-budget")
            .textContent = "&#8369;" +
                           totalBudget.toLocaleString();

    let badge    = document.getElementById(
        "currently-tracking-badge"
    );
    let trackBtn = document.getElementById("track-btn");

    if (plan.is_tracked) {
        badge.classList.remove("hidden");
        trackBtn.disabled = true;
    } else {
        badge.classList.add("hidden");
        trackBtn.disabled = false;
    }

    let container = document.getElementById(
        "expanded-days-content"
    );
    container.innerHTML = "";

    plan.days.forEach(function(day) {

        let dateObj   = new Date(day.day_date);
        let formatted = dateObj.toLocaleDateString("en-US", {
            weekday: "short",
            month:   "short",
            day:     "numeric"
        });

        let dayDiv       = document.createElement("div");
        dayDiv.className = "day-box";

        let headerRow       = document.createElement("div");
        headerRow.className = "day-header-row";
        headerRow.innerHTML =
            "<span class='day-date-label'>" +
            formatted + "</span>" +
            "<span class='day-budget-badge'>&#8369;" +
            parseFloat(day.budget || 0)
            .toLocaleString() + "</span>";
        dayDiv.appendChild(headerRow);

        day.activities.forEach(function(activity) {

            let actRow       = document.createElement("div");
            actRow.className = "activity-row";

            let cb        = document.createElement("input");
            cb.type       = "checkbox";
            cb.className  = "activity-checkbox";
            cb.setAttribute("data-id", activity.id);
            cb.checked    = activity.is_done;
            cb.addEventListener("change", function() {
                toggleActivity(this);
            });

            let details       = document.createElement("div");
            details.className = "activity-details";

            let name       = document.createElement("span");
            name.className = "activity-name" +
                (activity.is_done ? " completed" : "");
            name.textContent = activity.activity_name;

            let meta       = document.createElement("div");
            meta.className = "activity-meta";
            meta.innerHTML =
                "<span class='activity-time'>" +
                (activity.activity_time || "") + "</span>" +
                "<span class='activity-location'>" +
                (activity.location || "") + "</span>";

            details.appendChild(name);
            details.appendChild(meta);
            actRow.appendChild(cb);
            actRow.appendChild(details);
            dayDiv.appendChild(actRow);

        });

        container.appendChild(dayDiv);

    });

}

function closeExpandedModal() {
    document.getElementById("expanded-plan-modal")
            .classList.add("hidden");
    currentOpenPlanId = null;
}

async function trackPlan() {

    let userId = localStorage.getItem("userId");

    await db
        .from("plans")
        .update({ is_tracked: false })
        .eq("user_id", userId);

    await db
        .from("plans")
        .update({ is_tracked: true })
        .eq("id", currentOpenPlanId);

    document.getElementById("currently-tracking-badge")
            .classList.remove("hidden");
    document.getElementById("track-btn").disabled = true;

    loadAllPlans();
    alert("Plan is now being tracked!");

}


/* ─────────────────────────────────────────────────
   SECTION 8 — DELETE PLAN
───────────────────────────────────────────────── */

let planIdToDelete = null;

function openDeleteModal(event, planId, planName) {

    event.stopPropagation();
    planIdToDelete = planId;

    document.getElementById("delete-modal-message")
            .textContent =
            "Are you sure you want to delete \"" +
            planName + "\"? " +
            "This action cannot be undone.";

    document.getElementById("delete-modal")
            .classList.remove("hidden");

}

function closeDeleteModal() {
    document.getElementById("delete-modal")
            .classList.add("hidden");
    planIdToDelete = null;
}

async function confirmDelete() {

    if (!planIdToDelete) { return; }

    let { data: days } = await db
        .from("days")
        .select("id")
        .eq("plan_id", planIdToDelete);

    if (days && days.length > 0) {
        let dayIds = days.map(function(d) { return d.id; });
        await db
            .from("activities")
            .delete()
            .in("day_id", dayIds);
    }

    await db
        .from("days")
        .delete()
        .eq("plan_id", planIdToDelete);

    await db
        .from("plans")
        .delete()
        .eq("id", planIdToDelete);

    closeDeleteModal();
    loadAllPlans();

}


/* ─────────────────────────────────────────────────
   SECTION 9 — ADD PLAN
   KEY FIX: uses appendChild instead of innerHTML+=
   so existing typed data is never destroyed
───────────────────────────────────────────────── */

let newPlanName = "";

function openAddPlanStep1() {
    document.getElementById(
        "new-plan-name-input"
    ).value = "";
    document.getElementById("add-plan-modal-1")
            .classList.remove("hidden");
}

function closeAddPlanModal() {
    document.getElementById("add-plan-modal-1")
            .classList.add("hidden");
    document.getElementById("add-plan-modal-2")
            .classList.add("hidden");
    document.getElementById("add-days-container")
            .innerHTML = "";
    newPlanName = "";
}

function proceedToStep2() {

    let nameInput = document.getElementById(
        "new-plan-name-input"
    );

    if (nameInput.value.trim() === "") {
        alert("Please enter a name for your journey.");
        return;
    }

    newPlanName = nameInput.value.trim();

    document.getElementById("add-plan-modal-1")
            .classList.add("hidden");
    document.getElementById("add-plan-modal-2")
            .classList.remove("hidden");
    document.getElementById("add-plan-name-display")
            .value = newPlanName;

    /* Clear container then add first day */
    document.getElementById("add-days-container")
            .innerHTML = "";
    addAnotherDay("add");

}

function backToStep1() {
    document.getElementById("add-plan-modal-2")
            .classList.add("hidden");
    document.getElementById("add-plan-modal-1")
            .classList.remove("hidden");
}


/* ── THE CORE FIX ─────────────────────────────────
   Old code used innerHTML += which destroyed
   previously typed values because it rebuilt
   the entire container HTML from scratch.

   New code uses createElement + appendChild which
   adds new elements WITHOUT touching existing ones.
   User typed data stays intact.
────────────────────────────────────────────────── */
function addAnotherDay(mode) {

    let containerId = mode === "add"
        ? "add-days-container"
        : "edit-days-container";
    let container = document.getElementById(containerId);

    /* Find the last date input to auto-fill next date */
    let dateInputs = container.querySelectorAll(".date-input");
    let nextDate   = "";

    if (dateInputs.length > 0) {
        let lastDate = dateInputs[dateInputs.length - 1].value;
        if (lastDate !== "") {
            let dateObj = new Date(lastDate);
            dateObj.setDate(dateObj.getDate() + 1);
            nextDate = dateObj.toISOString().split("T")[0];
        }
    }

    /* Build the day block using createElement */
    /* This never touches existing DOM elements */
    let dayBlock       = document.createElement("div");
    dayBlock.className = "day-form-block";

    /* DAY HEADER: date picker + budget side by side */
    let headerDiv       = document.createElement("div");
    headerDiv.className = "day-form-header";

    /* Date group */
    let dateGroup       = document.createElement("div");
    let dateLbl         = document.createElement("p");
    dateLbl.className   = "day-form-date-label";
    dateLbl.textContent = "Date";

    let dateInput       = document.createElement("input");
    dateInput.type      = "date";
    dateInput.className = "date-input";
    dateInput.value     = nextDate;

    dateGroup.appendChild(dateLbl);
    dateGroup.appendChild(dateInput);

    /* Budget group */
    let budgetGroup       = document.createElement("div");
    let budgetLbl         = document.createElement("p");
    budgetLbl.className   = "day-form-budget-label";
    budgetLbl.textContent = "Total Budget";

    let budgetInput         = document.createElement("input");
    budgetInput.type        = "number";
    budgetInput.className   = "budget-input";
    budgetInput.placeholder = "0";
    budgetInput.value       = "0";

    budgetGroup.appendChild(budgetLbl);
    budgetGroup.appendChild(budgetInput);

    headerDiv.appendChild(dateGroup);
    headerDiv.appendChild(budgetGroup);
    dayBlock.appendChild(headerDiv);

    /* DELETE DAY BUTTON */
    let deleteDayBtn       = document.createElement("button");
    deleteDayBtn.className = "delete-day-btn";
    deleteDayBtn.textContent = "✕ Remove this day";
    deleteDayBtn.type      = "button";
    deleteDayBtn.onclick   = function() {
        /* Remove the entire day block */
        container.removeChild(dayBlock);
        updateDayCount(mode);
        updateBudgetTotal(mode);
    };
    dayBlock.appendChild(deleteDayBtn);

    /* ACTIVITIES LABEL */
    let activitiesLbl       = document.createElement("p");
    activitiesLbl.className = "activities-label";
    activitiesLbl.textContent = "Activities";
    dayBlock.appendChild(activitiesLbl);

    /* ACTIVITIES CONTAINER inside this day block */
    let activitiesContainer       = document.createElement("div");
    activitiesContainer.className = "activities-container";
    dayBlock.appendChild(activitiesContainer);

    /* Two default empty activity rows */
    addActivityRowToContainer(activitiesContainer);
    addActivityRowToContainer(activitiesContainer);

    /* ADD ACTIVITY BUTTON for this day */
    let addActBtn       = document.createElement("button");
    addActBtn.className = "add-activity-btn";
    addActBtn.type      = "button";
    addActBtn.textContent = "+ Add Activity";
    addActBtn.onclick   = function() {
        addActivityRowToContainer(activitiesContainer);
    };
    dayBlock.appendChild(addActBtn);

    /* Append the whole day block to the container */
    /* appendChild NEVER touches existing elements */
    container.appendChild(dayBlock);

    updateDayCount(mode);

    /* Update budget total when budget changes */
    budgetInput.addEventListener("input", function() {
        updateBudgetTotal(mode);
    });

}


/* ── ACTIVITY ROW ─────────────────────────────────
   Creates one activity row using createElement.
   Takes an activitiesContainer as parameter
   so it knows exactly where to append.
   Includes a delete button for each activity.
────────────────────────────────────────────────── */
function addActivityRowToContainer(
    activitiesContainer,
    prefillName,
    prefillTime,
    prefillLocation
) {

    let actBlock       = document.createElement("div");
    actBlock.className = "activity-form-block";

    /* DELETE ACTIVITY BUTTON: top right of each activity */
    let deleteActBtn       = document.createElement("button");
    deleteActBtn.className = "delete-activity-btn";
    deleteActBtn.type      = "button";
    deleteActBtn.textContent = "✕";
    deleteActBtn.title     = "Remove this activity";
    deleteActBtn.onclick   = function() {
        activitiesContainer.removeChild(actBlock);
    };
    actBlock.appendChild(deleteActBtn);

    /* ACTIVITY DESCRIPTION INPUT */
    let descInput         = document.createElement("input");
    descInput.type        = "text";
    descInput.className   = "activity-desc-input";
    descInput.placeholder = "Activity description";
    descInput.value       = prefillName || "";
    actBlock.appendChild(descInput);

    /* TIME AND LOCATION ROW */
    let timeLocRow       = document.createElement("div");
    timeLocRow.className = "activity-time-location-row";

    let timeInput         = document.createElement("input");
    timeInput.type        = "text";
    timeInput.className   = "time-input";
    timeInput.placeholder = "Time";
    timeInput.value       = prefillTime || "";

    let locInput         = document.createElement("input");
    locInput.type        = "text";
    locInput.className   = "location-input";
    locInput.placeholder = "Location";
    locInput.value       = prefillLocation || "";

    timeLocRow.appendChild(timeInput);
    timeLocRow.appendChild(locInput);
    actBlock.appendChild(timeLocRow);

    activitiesContainer.appendChild(actBlock);

}


function updateDayCount(mode) {

    let containerId = mode === "add"
        ? "add-days-container"
        : "edit-days-container";
    let countId = mode === "add"
        ? "add-days-count"
        : "edit-days-count";

    let count = document.getElementById(containerId)
        .querySelectorAll(".day-form-block").length;

    let el = document.getElementById(countId);
    if (el) { el.textContent = count; }

}


function updateBudgetTotal(mode) {

    let containerId = mode === "add"
        ? "add-days-container"
        : "edit-days-container";
    let totalId = mode === "add"
        ? "add-budget-total"
        : "edit-budget-total";

    let inputs = document.getElementById(containerId)
        .querySelectorAll(".budget-input");

    let total = 0;
    inputs.forEach(function(inp) {
        total += parseFloat(inp.value || 0);
    });

    let el = document.getElementById(totalId);
    if (el) { el.textContent = total.toLocaleString(); }

}


function collectDayData(mode) {

    let containerId = mode === "add"
        ? "add-days-container"
        : "edit-days-container";

    let container = document.getElementById(containerId);
    let dayBlocks = container.querySelectorAll(
        ".day-form-block"
    );
    let days = [];

    dayBlocks.forEach(function(block) {

        let dateVal   = block.querySelector(
            ".date-input"
        ).value;
        let budgetVal = block.querySelector(
            ".budget-input"
        ).value;

        let actBlocks = block.querySelectorAll(
            ".activity-form-block"
        );
        let activities = [];

        actBlocks.forEach(function(actBlock) {
            let desc = actBlock.querySelector(
                ".activity-desc-input"
            ).value.trim();
            if (desc === "") { return; }
            activities.push({
                activity_name: desc,
                activity_time: actBlock.querySelector(
                    ".time-input"
                ).value.trim(),
                location: actBlock.querySelector(
                    ".location-input"
                ).value.trim()
            });
        });

        days.push({
            day_date:   dateVal,
            budget:     parseFloat(budgetVal) || 0,
            activities: activities
        });

    });

    return days;

}


async function savePlan() {

    let userId   = localStorage.getItem("userId");
    let planName = document.getElementById(
        "add-plan-name-display"
    ).value.trim();

    if (planName === "") {
        alert("Please enter a journey name.");
        return;
    }

    let days = collectDayData("add");

    if (days.length === 0) {
        alert("Please add at least one day.");
        return;
    }

    /* Validate at least one day has a date */
    let hasDate = days.some(function(d) {
        return d.day_date !== "";
    });
    if (!hasDate) {
        alert("Please set a date for at least one day.");
        return;
    }

    /* Insert the plan */
    let { data: plan, error: planError } = await db
        .from("plans")
        .insert({
            user_id:   userId,
            plan_name: planName
        })
        .select()
        .single();

    if (planError) {
        alert("Failed to create plan: " + planError.message);
        return;
    }

    /* Insert each day and its activities */
    for (let day of days) {

        let { data: dayRow, error: dayError } = await db
            .from("days")
            .insert({
                plan_id:  plan.id,
                day_date: day.day_date || null,
                budget:   day.budget
            })
            .select()
            .single();

        if (dayError) {
            console.error("Day insert error:", dayError);
            continue;
        }

        if (day.activities.length > 0) {

            let toInsert = day.activities.map(function(a) {
                return {
                    day_id:        dayRow.id,
                    activity_name: a.activity_name,
                    activity_time: a.activity_time || null,
                    location:      a.location || null,
                    is_done:       false
                };
            });

            let { error: actError } = await db
                .from("activities")
                .insert(toInsert);

            if (actError) {
                console.error("Activity insert:", actError);
            }

        }

    }

    /* Log for admin */
    await db.from("admin_log").insert({
        action:  "plan_created",
        user_id: userId,
        details: planName
    });

    closeAddPlanModal();
    loadAllPlans();

}


/* ─────────────────────────────────────────────────
   SECTION 10 — EDIT PLAN
───────────────────────────────────────────────── */

async function openEditModal() {

    document.getElementById("expanded-plan-modal")
            .classList.add("hidden");

    let plan = await getFullPlan(currentOpenPlanId);
    populateEditModal(plan);

    document.getElementById("edit-plan-modal")
            .classList.remove("hidden");

}

function populateEditModal(plan) {

    document.getElementById("edit-plan-name-input")
            .value = plan.plan_name;

    let container = document.getElementById(
        "edit-days-container"
    );
    container.innerHTML = "";

    plan.days.forEach(function(day) {

        /* Build the day block using createElement */
        let dayBlock       = document.createElement("div");
        dayBlock.className = "day-form-block";

        let headerDiv       = document.createElement("div");
        headerDiv.className = "day-form-header";

        let dateGroup       = document.createElement("div");
        let dateLbl         = document.createElement("p");
        dateLbl.className   = "day-form-date-label";
        dateLbl.textContent = "Date";

        let dateInput       = document.createElement("input");
        dateInput.type      = "date";
        dateInput.className = "date-input";
        dateInput.value     = day.day_date || "";

        dateGroup.appendChild(dateLbl);
        dateGroup.appendChild(dateInput);

        let budgetGroup       = document.createElement("div");
        let budgetLbl         = document.createElement("p");
        budgetLbl.className   = "day-form-budget-label";
        budgetLbl.textContent = "Total Budget";

        let budgetInput       = document.createElement("input");
        budgetInput.type      = "number";
        budgetInput.className = "budget-input";
        budgetInput.value     = day.budget || 0;

        budgetInput.addEventListener("input", function() {
            updateBudgetTotal("edit");
        });

        budgetGroup.appendChild(budgetLbl);
        budgetGroup.appendChild(budgetInput);

        headerDiv.appendChild(dateGroup);
        headerDiv.appendChild(budgetGroup);
        dayBlock.appendChild(headerDiv);

        /* Delete day button */
        let deleteDayBtn       = document.createElement("button");
        deleteDayBtn.className = "delete-day-btn";
        deleteDayBtn.type      = "button";
        deleteDayBtn.textContent = "✕ Remove this day";
        deleteDayBtn.onclick   = function() {
            container.removeChild(dayBlock);
            updateDayCount("edit");
            updateBudgetTotal("edit");
        };
        dayBlock.appendChild(deleteDayBtn);

        let activitiesLbl         = document.createElement("p");
        activitiesLbl.className   = "activities-label";
        activitiesLbl.textContent = "Activities";
        dayBlock.appendChild(activitiesLbl);

        let activitiesContainer       = document.createElement("div");
        activitiesContainer.className = "activities-container";
        dayBlock.appendChild(activitiesContainer);

        /* Pre-fill existing activities */
        day.activities.forEach(function(activity) {
            addActivityRowToContainer(
                activitiesContainer,
                activity.activity_name,
                activity.activity_time,
                activity.location
            );
        });

        let addActBtn         = document.createElement("button");
        addActBtn.className   = "add-activity-btn";
        addActBtn.type        = "button";
        addActBtn.textContent = "+ Add Activity";
        addActBtn.onclick     = function() {
            addActivityRowToContainer(activitiesContainer);
        };
        dayBlock.appendChild(addActBtn);

        container.appendChild(dayBlock);

    });

    updateDayCount("edit");
    updateBudgetTotal("edit");

}

function closeEditModal() {
    document.getElementById("edit-plan-modal")
            .classList.add("hidden");
}

async function saveEditedPlan() {

    let planName = document.getElementById(
        "edit-plan-name-input"
    ).value.trim();

    if (planName === "") {
        alert("Please enter a journey name.");
        return;
    }

    await db
        .from("plans")
        .update({ plan_name: planName })
        .eq("id", currentOpenPlanId);

    let { data: oldDays } = await db
        .from("days")
        .select("id")
        .eq("plan_id", currentOpenPlanId);

    if (oldDays && oldDays.length > 0) {
        let oldDayIds = oldDays.map(function(d) {
            return d.id;
        });
        await db
            .from("activities")
            .delete()
            .in("day_id", oldDayIds);
    }

    await db
        .from("days")
        .delete()
        .eq("plan_id", currentOpenPlanId);

    let days = collectDayData("edit");

    for (let day of days) {

        let { data: dayRow } = await db
            .from("days")
            .insert({
                plan_id:  currentOpenPlanId,
                day_date: day.day_date || null,
                budget:   day.budget
            })
            .select()
            .single();

        if (day.activities.length > 0) {
            await db.from("activities").insert(
                day.activities.map(function(a) {
                    return {
                        day_id:        dayRow.id,
                        activity_name: a.activity_name,
                        activity_time: a.activity_time || null,
                        location:      a.location || null,
                        is_done:       false
                    };
                })
            );
        }

    }

    closeEditModal();
    loadAllPlans();

}


/* ─────────────────────────────────────────────────
   SECTION 11 — ACCOUNT PAGE
───────────────────────────────────────────────── */

async function initAccountPage() {

    let username = localStorage.getItem("username");
    let userId   = localStorage.getItem("userId");

    let displayUsername = document.getElementById(
        "display-username"
    );
    if (displayUsername) {
        displayUsername.textContent = username;
    }

    let viewUsername = document.getElementById(
        "view-username"
    );
    if (viewUsername) {
        viewUsername.textContent = username;
    }

    let editInput = document.getElementById(
        "edit-username-input"
    );
    if (editInput) { editInput.value = username; }

    let { data: profile } = await db
        .from("profiles")
        .select("completed_count")
        .eq("id", userId)
        .single();

    let { count: totalPlans } = await db
        .from("plans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

    let totalEl = document.getElementById(
        "total-plans-count"
    );
    if (totalEl) {
        totalEl.textContent = totalPlans || 0;
    }

    let completedEl = document.getElementById(
        "completed-count"
    );
    if (completedEl) {
        completedEl.textContent = profile
            ? profile.completed_count
            : 0;
    }

}

function showEditState() {
    document.getElementById("profile-view-state")
            .classList.add("hidden");
    document.getElementById("profile-edit-state")
            .classList.remove("hidden");
}

function hideEditState() {
    document.getElementById("profile-edit-state")
            .classList.add("hidden");
    document.getElementById("profile-view-state")
            .classList.remove("hidden");
}

function togglePasswordVisibility() {
    let display = document.getElementById("password-display");
    if (display.textContent.includes("•")) {
        display.textContent = "Passwords are secured by Supabase.";
    } else {
        display.textContent = "••••••••";
    }
}

async function saveProfileChanges() {

    let userId      = localStorage.getItem("userId");
    let newUsername = document.getElementById(
        "edit-username-input"
    ).value.trim();

    if (newUsername === "") {
        alert("Username cannot be empty.");
        return;
    }

    let { error } = await db
        .from("profiles")
        .update({ username: newUsername })
        .eq("id", userId);

    if (error) {
        alert("Failed to update username: " + error.message);
        return;
    }

    localStorage.setItem("username", newUsername);
    alert("Profile updated successfully.");
    window.location.reload();

}

function openDeleteAccountModal() {
    document.getElementById("delete-account-modal")
            .classList.remove("hidden");
}

function closeDeleteAccountModal() {
    document.getElementById("delete-account-modal")
            .classList.add("hidden");
}

async function confirmDeleteAccount() {

    let userId = localStorage.getItem("userId");

    let { data: plans } = await db
        .from("plans")
        .select("id")
        .eq("user_id", userId);

    if (plans && plans.length > 0) {

        let planIds = plans.map(function(p) { return p.id; });

        let { data: days } = await db
            .from("days")
            .select("id")
            .in("plan_id", planIds);

        if (days && days.length > 0) {
            let dayIds = days.map(function(d) {
                return d.id;
            });
            await db
                .from("activities")
                .delete()
                .in("day_id", dayIds);
        }

        await db.from("days").delete()
                .in("plan_id", planIds);
        await db.from("plans").delete()
                .in("id", planIds);

    }

    await db.from("admin_log").delete()
            .eq("user_id", userId);
    await db.from("profiles").delete()
            .eq("id", userId);

    await db.auth.signOut();
    localStorage.clear();
    window.location.href = "signin.html";

}


/* ─────────────────────────────────────────────────
   SECTION 12 — ADMIN PAGES
───────────────────────────────────────────────── */

async function initAdminPage() {

    let role = localStorage.getItem("role");
    if (role !== "admin") {
        window.location.href = "index.html";
        return;
    }

    let username    = localStorage.getItem("username");
    let sidebarName = document.getElementById(
        "admin-display-name"
    );
    if (sidebarName) {
        sidebarName.textContent = username;
    }

    let welcomeName = document.getElementById(
        "admin-welcome-name"
    );
    if (welcomeName) {
        welcomeName.textContent = username;
    }

    loadAdminStats();

}

async function loadAdminStats() {

    /* User total */
    let { count: userTotal } = await db
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "user");

    /* Itinerary total */
    let { count: itineraryTotal } = await db
        .from("plans")
        .select("*", { count: "exact", head: true });

    /* Completion total */
    let { data: profilesData } = await db
        .from("profiles")
        .select("completed_count");

    let completionTotal = profilesData
        ? profilesData.reduce(function(sum, p) {
            return sum + (p.completed_count || 0);
          }, 0)
        : 0;

    /* Most popular plan */
    let { data: allPlans } = await db
        .from("plans")
        .select("plan_name");

    let planCounts = {};
    if (allPlans) {
        allPlans.forEach(function(p) {
            planCounts[p.plan_name] =
                (planCounts[p.plan_name] || 0) + 1;
        });
    }

    let popularPlanName  = "No data yet";
    let popularPlanCount = 0;
    Object.keys(planCounts).forEach(function(name) {
        if (planCounts[name] > popularPlanCount) {
            popularPlanName  = name;
            popularPlanCount = planCounts[name];
        }
    });
    let popularPlan = popularPlanCount > 0
        ? popularPlanName +
          " (" + popularPlanCount + " times)"
        : "No data yet";

    /* Most popular location */
    let { data: allActivities } = await db
        .from("activities")
        .select("location");

    let locationCounts = {};
    if (allActivities) {
        allActivities.forEach(function(a) {
            if (!a.location) { return; }
            locationCounts[a.location] =
                (locationCounts[a.location] || 0) + 1;
        });
    }

    let popularLocName  = "No data yet";
    let popularLocCount = 0;
    Object.keys(locationCounts).forEach(function(loc) {
        if (locationCounts[loc] > popularLocCount) {
            popularLocName  = loc;
            popularLocCount = locationCounts[loc];
        }
    });
    let popularLocation = popularLocCount > 0
        ? popularLocName + " (" + popularLocCount + " times)"
        : "No data yet";

    /* Common day of week */
    let { data: allDays } = await db
        .from("days")
        .select("day_date");

    let dayCounts = {};
    let dayNames  = [
        "Sunday","Monday","Tuesday","Wednesday",
        "Thursday","Friday","Saturday"
    ];

    if (allDays) {
        allDays.forEach(function(d) {
            if (!d.day_date) { return; }
            let idx     = new Date(d.day_date).getDay();
            let dayName = dayNames[idx];
            dayCounts[dayName] =
                (dayCounts[dayName] || 0) + 1;
        });
    }

    let commonDayName  = "No data yet";
    let commonDayCount = 0;
    Object.keys(dayCounts).forEach(function(d) {
        if (dayCounts[d] > commonDayCount) {
            commonDayName  = d;
            commonDayCount = dayCounts[d];
        }
    });
    let commonDay = commonDayCount > 0
        ? commonDayName + " (" + commonDayCount + " times)"
        : "No data yet";

    /* Common itinerary length */
    let { data: planDaysData } = await db
        .from("days")
        .select("plan_id");

    let lengthCounts = {};
    if (planDaysData) {
        let planDayCounts = {};
        planDaysData.forEach(function(d) {
            planDayCounts[d.plan_id] =
                (planDayCounts[d.plan_id] || 0) + 1;
        });
        Object.keys(planDayCounts).forEach(function(pid) {
            let len = planDayCounts[pid];
            lengthCounts[len] =
                (lengthCounts[len] || 0) + 1;
        });
    }

    let commonLenNum   = "No data yet";
    let commonLenCount = 0;
    Object.keys(lengthCounts).forEach(function(len) {
        if (lengthCounts[len] > commonLenCount) {
            commonLenNum   = len;
            commonLenCount = lengthCounts[len];
        }
    });
    let commonLength = commonLenCount > 0
        ? commonLenNum +
          " Days (" + commonLenCount + " plans)"
        : "No data yet";

    /* Most active user */
    let { data: userPlansData } = await db
        .from("plans")
        .select("user_id");

    let userPlanCounts = {};
    if (userPlansData) {
        userPlansData.forEach(function(p) {
            userPlanCounts[p.user_id] =
                (userPlanCounts[p.user_id] || 0) + 1;
        });
    }

    let activeUserId    = null;
    let activeUserCount = 0;
    Object.keys(userPlanCounts).forEach(function(uid) {
        if (userPlanCounts[uid] > activeUserCount) {
            activeUserId    = uid;
            activeUserCount = userPlanCounts[uid];
        }
    });

    let activeUsername = "No data yet";
    if (activeUserId) {
        let { data: activeProfile } = await db
            .from("profiles")
            .select("username")
            .eq("id", activeUserId)
            .single();
        if (activeProfile) {
            activeUsername = activeProfile.username;
        }
    }

    /* Tracked count */
    let { count: trackedCount } = await db
        .from("plans")
        .select("*", { count: "exact", head: true })
        .eq("is_tracked", true);

    /* Fill elements */
    let fill = function(id, val) {
        let el = document.getElementById(id);
        if (el) { el.textContent = val; }
    };

    fill("stat-user-total",       userTotal       || 0);
    fill("stat-itinerary-total",  itineraryTotal  || 0);
    fill("stat-completion-total", completionTotal);
    fill("stat-popular-plan",     popularPlan);
    fill("stat-popular-location", popularLocation);
    fill("stat-common-day",       commonDay);
    fill("stat-common-length",    commonLength);
    fill("stat-active-username",  activeUsername);
    fill("stat-active-plans",     activeUserCount || 0);
    fill("stat-tracked-count",    trackedCount    || 0);

}

async function initAdminAccountPage() {

    let role = localStorage.getItem("role");
    if (role !== "admin") {
        window.location.href = "index.html";
        return;
    }

    let username = localStorage.getItem("username");

    let ids = [
        "admin-display-name",
        "account-display-username",
        "admin-view-username"
    ];
    ids.forEach(function(id) {
        let el = document.getElementById(id);
        if (el) { el.textContent = username; }
    });

    let editInput = document.getElementById(
        "admin-edit-username"
    );
    if (editInput) { editInput.value = username; }

}

function showAdminEditState() {
    document.getElementById("admin-view-state")
            .classList.add("hidden");
    document.getElementById("admin-edit-state")
            .classList.remove("hidden");
}

function hideAdminEditState() {
    document.getElementById("admin-edit-state")
            .classList.add("hidden");
    document.getElementById("admin-view-state")
            .classList.remove("hidden");
}

async function saveAdminProfileChanges() {

    let userId      = localStorage.getItem("userId");
    let newUsername = document.getElementById(
        "admin-edit-username"
    ).value.trim();

    if (newUsername === "") {
        alert("Username cannot be empty.");
        return;
    }

    let { error } = await db
        .from("profiles")
        .update({ username: newUsername })
        .eq("id", userId);

    if (error) {
        alert("Failed to update: " + error.message);
        return;
    }

    localStorage.setItem("username", newUsername);
    alert("Profile updated successfully.");
    window.location.reload();

}

function adminSignOut() {
    db.auth.signOut();
    localStorage.clear();
    window.location.href = "signin.html";
}


/* ─────────────────────────────────────────────────
   SECTION 13 — UTILITY FUNCTIONS
───────────────────────────────────────────────── */

function formatCurrency(amount) {
    return "&#8369;" + parseFloat(amount).toLocaleString();
}

function formatDate(dateString) {
    let dateObj = new Date(dateString);
    return dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month:   "short",
        day:     "numeric"
    });
}
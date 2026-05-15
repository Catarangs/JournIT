// 1. SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://vptvzuzydcweouodwvuy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_m1uCdwzt48lWw_WvGg23ag_nucwaJnz';

// Initialize the Supabase Client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ═══════════════════════════════════════════════════
   JOURNIT — script.js
   One JavaScript file for all pages.
   Sections:
   1.  Page initialization
   2.  Hero slideshow
   3.  Authentication (sign up, sign in, sign out)
   4.  Homepage — tracking and progress
   5.  Dashboard — plans grid
   6.  Dashboard — expanded plan modal
   7.  Dashboard — delete plan
   8.  Dashboard — add plan
   9.  Dashboard — edit plan
   10. Account page
   11. Admin pages
   12. Utility functions
═══════════════════════════════════════════════════ */


/* ─────────────────────────────────────────────────
   SECTION 1 — PAGE INITIALIZATION
   Runs when any page finishes loading.
   Checks which page is open and calls the
   correct setup function for that page.
───────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", function() {
    let page = window.location.pathname;
    if (page.includes("signin") || page.includes("signup")) { return; }
    
    // Check if user is logged in for protected pages
    if (page.includes("dashboard") || page.includes("account")) {
        checkLogin();
    }
    
    if (page.includes("dashboard")) { initDashboard(); }
    else if (page.includes("account")) { initAccountPage(); }
    else { initHomepage(); }
});


/* ─────────────────────────────────────────────────
   SECTION 2 — HERO SLIDESHOW
   Runs only on the homepage.
   Moves the "active" class from slide to slide
   every 4 seconds automatically.
───────────────────────────────────────────────── */

/* currentSlide tracks which slide is visible */
let currentSlide = 0;

function initSlideshow() {

    /* Get all slide divs and all dot spans */
    let slides = document.querySelectorAll(".slide");
    let dots = document.querySelectorAll(".dot");

    /* If no slides found — slideshow not on this page */
    if (slides.length === 0) { return; }

    /* Add click event to each dot */
    /* When a dot is clicked, jump to that slide */
    dots.forEach(function(dot) {
        dot.addEventListener("click", function() {
            /* data-index stored on each dot in HTML */
            let index = parseInt(dot.getAttribute("data-index"));
            goToSlide(index, slides, dots);
        });
    });

    /* setInterval runs goToNextSlide every 4 seconds */
    setInterval(function() {
        goToNextSlide(slides, dots);
    }, 4000);

}

function goToNextSlide(slides, dots) {
    /* Move to the next slide */
    /* If we are on the last slide, wrap back to 0 */
    let next = (currentSlide + 1) % slides.length;
    goToSlide(next, slides, dots);
}

function goToSlide(index, slides, dots) {

    /* Remove "active" from current slide and dot */
    slides[currentSlide].classList.remove("active");
    dots[currentSlide].classList.remove("active");

    /* Update currentSlide to the new index */
    currentSlide = index;

    /* Add "active" to the new slide and dot */
    slides[currentSlide].classList.add("active");
    dots[currentSlide].classList.add("active");

}

/* ───────────────────────────────────────────────── 
   SECTION 3 — AUTHENTICATION (Supabase)
   ───────────────────────────────────────────────── */

async function signUp() {
    const email = document.getElementById("username").value.trim(); 
    const password = document.getElementById("password").value.trim();

    if (!email.includes("@")) {
        alert("Please enter a valid email address.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("Success! Check your email for a confirmation link.");
        window.location.href = "signin.html";
    }
}

async function signIn() {
    const email = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("Login Failed: " + error.message);
    } else {
        localStorage.setItem("username", data.user.email);
        localStorage.setItem("userId", data.user.id);
        alert("Welcome back!");
        window.location.href = "index.html";
    }
}

function checkLogin() {
    let username = localStorage.getItem("username");
    if (!username) { window.location.href = "signin.html"; }
}
/*----------------------------------------------------------------------- */

function logout() {
    supabaseClient.auth.signOut().then(() => {
        localStorage.clear();
        window.location.href = "signin.html";
    });
}


function checkLogin() {
    /* If no username in localStorage, user is not logged in */
    /* Redirect to sign in page immediately */
    let username = localStorage.getItem("username");
    if (!username) {
        window.location.href = "signin.html";
    }
}


/* ─────────────────────────────────────────────────
   SECTION 4 — HOMEPAGE
   Initializes the homepage.
   Loads tracking data if a plan is being tracked.
   Runs the slideshow.
───────────────────────────────────────────────── */

function initHomepage() {

    /* Start the hero slideshow */
    initSlideshow();

    /* Load the currently tracked plan if one exists */
    loadTrackedPlan();

}


function scrollToPlans() {
    /* Smoothly scroll down to the plans section */
    /* The HTML element with id="plans-section" */
    let section = document.getElementById("plans-section");
    if (section) {
        /* scrollIntoView scrolls the page until
           the element is visible on screen */
        section.scrollIntoView({ behavior: "smooth" });
    }
}


function loadTrackedPlan() {

    let userId = localStorage.getItem("userId");

    fetch("php/itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "getTracked",
            userId: userId
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        if (data.success && data.plan) {
            /* A plan is being tracked — show active state */
            showActivePlanState(data.plan);
        } else {
            /* No plan tracked — show empty state */
            showNoPlanState();
        }

    });

}


function showNoPlanState() {
    /* Show the empty state, hide the active state */
    document.getElementById("no-plan-state")
            .classList.remove("hidden");
    document.getElementById("active-plan-state")
            .classList.add("hidden");
}


function showActivePlanState(plan) {

    /* Hide the empty state, show the active state */
    document.getElementById("no-plan-state")
            .classList.add("hidden");
    document.getElementById("active-plan-state")
            .classList.remove("hidden");

    /* Fill in the plan name */
    document.getElementById("tracking-plan-name")
            .textContent = plan.plan_name;

    /* Fill in days count and budget */
    document.getElementById("tracking-days-count")
            .textContent = plan.days.length + " Days";

    /* Calculate total budget across all days */
    let totalBudget = 0;
    plan.days.forEach(function(day) {
        totalBudget += parseFloat(day.budget);
    });
    document.getElementById("tracking-budget")
            .textContent = "₱" + totalBudget.toLocaleString();
    /* .toLocaleString() formats numbers with commas:
       1500 becomes "1,500" automatically */

    /* Build the day boxes with checkboxes */
    buildTrackingDays(plan.days);

    /* Update the progress tracker */
    updateProgress(plan.days);

}


function buildTrackingDays(days) {

    let container = document.getElementById("tracking-days");
    /* Clear any previous content */
    container.innerHTML = "";

    days.forEach(function(day) {

        /* Format the date from "2026-05-07" to "Thu, May 7" */
        let dateObj = new Date(day.day_date);
        let formatted = dateObj.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric"
        });

        /* Build the HTML for this day box */
        /* We use innerHTML here because we are building
           a whole HTML structure dynamically */
        let dayHTML = "<div class='day-box'>";
        dayHTML += "<div class='day-header-row'>";
        dayHTML += "<span class='day-date-label'>" + formatted + "</span>";
        dayHTML += "<span class='day-budget-badge'>₱" +
                   parseFloat(day.budget).toLocaleString() + "</span>";
        dayHTML += "</div>";

        /* Add each activity with a checkbox */
        day.activities.forEach(function(activity) {

            let checked = activity.is_done == 1 ? "checked" : "";
            let doneClass = activity.is_done == 1 ? "completed" : "";

            dayHTML += "<div class='activity-row'>";
            dayHTML += "<input type='checkbox' class='activity-checkbox' " +
                       "data-id='" + activity.id + "' " +
                       checked +
                       " onchange='toggleActivity(this)'>";
            dayHTML += "<div class='activity-details'>";
            dayHTML += "<span class='activity-name " + doneClass + "'>" +
                       activity.activity_name + "</span>";
            dayHTML += "<div class='activity-meta'>";
            dayHTML += "<span class='activity-time'>" +
                       activity.activity_time + "</span>";
            dayHTML += "<span class='activity-location'>" +
                       activity.location + "</span>";
            dayHTML += "</div>";
            dayHTML += "</div>";
            dayHTML += "</div>";

        });

        dayHTML += "</div>";

        /* Insert the built HTML into the container */
        container.innerHTML += dayHTML;

    });

}


function toggleActivity(checkbox) {

    /* Read which activity was checked/unchecked */
    let activityId = checkbox.getAttribute("data-id");
    let isDone = checkbox.checked ? 1 : 0;

    /* Update the activity name appearance */
    let nameSpan = checkbox.parentElement
                           .querySelector(".activity-name");
    if (isDone) {
        nameSpan.classList.add("completed");
    } else {
        nameSpan.classList.remove("completed");
    }

    /* Send update to PHP — saves to database */
    fetch("php/itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "toggleActivity",
            activityId: activityId,
            isDone: isDone
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function() {
        /* Reload the tracked plan to update progress */
        loadTrackedPlan();
    });

}


function updateProgress(days) {

    let totalActivities = 0;
    let doneActivities = 0;
    let totalBudget = 0;
    let spentBudget = 0;

    days.forEach(function(day) {

        totalBudget += parseFloat(day.budget);

        /* Check if ALL activities in this day are done */
        let dayDone = true;

        day.activities.forEach(function(activity) {
            totalActivities++;
            if (activity.is_done == 1) {
                doneActivities++;
            } else {
                dayDone = false;
            }
        });

        /* If all activities in the day are done,
           count that day's budget as spent */
        if (dayDone && day.activities.length > 0) {
            spentBudget += parseFloat(day.budget);
        }

    });

    /* Calculate percentage */
    let percent = 0;
    if (totalActivities > 0) {
        percent = Math.round(
            (doneActivities / totalActivities) * 100
        );
        /* Math.round rounds to the nearest whole number */
    }

    /* Update the percentage text */
    document.getElementById("progress-percent")
            .textContent = percent + "%";

    /* Update activities counter */
    document.getElementById("activities-done")
            .textContent = doneActivities;
    document.getElementById("activities-total")
            .textContent = totalActivities;

    /* Update budget display */
    document.getElementById("budget-spent")
            .textContent = "₱" + spentBudget.toLocaleString();
    document.getElementById("budget-total")
            .textContent = "₱" + totalBudget.toLocaleString();

}


function stopTracking() {

    let userId = localStorage.getItem("userId");

    fetch("php/itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "stopTracking",
            userId: userId
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.success) {
            /* Update completed count in users table */
            updateCompletedCount();
            /* Return homepage to empty state */
            showNoPlanState();
        }
    });

}


function updateCompletedCount() {

    let userId = localStorage.getItem("userId");

    fetch("php/itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "incrementCompleted",
            userId: userId
        })
    });

}


/* ─────────────────────────────────────────────────
   SECTION 5 — DASHBOARD — PLANS GRID
   Loads all plans for the current user and
   builds the plan cards in the grid.
───────────────────────────────────────────────── */

function initDashboard() {

    /* Fill the header username if element exists */
    loadAllPlans();

}


function loadAllPlans() {

    let userId = localStorage.getItem("userId");

    fetch("php/itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "getAll",
            userId: userId
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        let grid = document.getElementById("plans-grid");
        /* Clear previous cards */
        grid.innerHTML = "";

        if (!data.success || data.plans.length === 0) {
            /* No plans yet — grid stays empty */
            return;
        }

        /* Build one card per plan */
        data.plans.forEach(function(plan) {
            grid.innerHTML += buildPlanCard(plan);
        });

    });

}


function buildPlanCard(plan) {

    /* Check if this plan is currently being tracked */
    let trackingBadge = "";
    if (plan.is_tracked == 1) {
        trackingBadge =
            "<span class='card-tracking-badge'>" +
            "● Currently Tracking</span>";
    }

    /* Build the card HTML */
    /* data-id stores plan id for when card is clicked */
    let card = "<div class='plan-card' " +
               "data-id='" + plan.id + "' " +
               "data-name='" + plan.plan_name + "' " +
               "onclick='openPlan(this)'>";

    /* Delete button — shown on hover via CSS */
    card += "<button class='card-delete-btn' " +
            "onclick='openDeleteModal(event, " +
            plan.id + ", \"" + plan.plan_name + "\")'>";
    card += "<img src='images/warning-icon.png' " +
            "class='card-delete-icon' alt='Delete'>";
    card += "</button>";

    /* Plan name */
    card += "<p class='plan-card-name'>" +
            plan.plan_name + "</p>";

    /* Days and budget meta row */
    card += "<div class='plan-card-meta'>";
    card += "<span class='plan-card-meta-item'>" +
            plan.days_count + " Days</span>";
    card += "<span class='plan-card-meta-item'>₱" +
            parseFloat(plan.total_budget)
            .toLocaleString() + "</span>";
    card += "</div>";

    card += trackingBadge;
    card += "</div>";

    return card;

}


/* ─────────────────────────────────────────────────
   SECTION 6 — DASHBOARD — EXPANDED PLAN MODAL
   Opens when a plan card is clicked.
   Shows full plan details with sticky header.
───────────────────────────────────────────────── */

/* Store the currently open plan id */
/* Used by track and edit functions */
let currentOpenPlanId = null;


function openPlan(cardElement) {

    /* Read plan id from the clicked card element */
    let planId = cardElement.getAttribute("data-id");
    currentOpenPlanId = planId;

    let userId = localStorage.getItem("userId");

    /* Fetch full plan data including all days and activities */
    fetch("php/itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "getPlan",
            planId: planId,
            userId: userId
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        if (data.success) {
            populateExpandedModal(data.plan);
            /* Show the modal */
            document.getElementById("expanded-plan-modal")
                    .classList.remove("hidden");
        }

    });

}


function populateExpandedModal(plan) {

    /* Fill plan name */
    document.getElementById("expanded-plan-name")
            .textContent = plan.plan_name;

    /* Fill days count and total budget */
    let totalBudget = 0;
    plan.days.forEach(function(day) {
        totalBudget += parseFloat(day.budget);
    });

    document.getElementById("expanded-days-count")
            .textContent = plan.days.length + " Days";
    document.getElementById("expanded-budget")
            .textContent = "₱" + totalBudget.toLocaleString();

    /* Show or hide the "Currently Tracking" badge */
    let badge = document.getElementById(
        "currently-tracking-badge"
    );
    if (plan.is_tracked == 1) {
        badge.classList.remove("hidden");
        /* Disable track button if already tracking */
        document.getElementById("track-btn").disabled = true;
    } else {
        badge.classList.add("hidden");
        document.getElementById("track-btn").disabled = false;
    }

    /* Build day boxes with activities and checkboxes */
    let container = document.getElementById(
        "expanded-days-content"
    );
    container.innerHTML = "";

    plan.days.forEach(function(day) {

        let dateObj = new Date(day.day_date);
        let formatted = dateObj.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric"
        });

        let dayHTML = "<div class='day-box'>";
        dayHTML += "<div class='day-header-row'>";
        dayHTML += "<span class='day-date-label'>" +
                   formatted + "</span>";
        dayHTML += "<span class='day-budget-badge'>₱" +
                   parseFloat(day.budget)
                   .toLocaleString() + "</span>";
        dayHTML += "</div>";

        day.activities.forEach(function(activity) {

            let checked = activity.is_done == 1 ? "checked" : "";
            let doneClass = activity.is_done == 1 ?
                            "completed" : "";

            dayHTML += "<div class='activity-row'>";
            dayHTML += "<input type='checkbox' " +
                       "class='activity-checkbox' " +
                       "data-id='" + activity.id + "' " +
                       checked +
                       " onchange='toggleActivity(this)'>";
            dayHTML += "<div class='activity-details'>";
            dayHTML += "<span class='activity-name " +
                       doneClass + "'>" +
                       activity.activity_name + "</span>";
            dayHTML += "<div class='activity-meta'>";
            dayHTML += "<span class='activity-time'>" +
                       activity.activity_time + "</span>";
            dayHTML += "<span class='activity-location'>" +
                       activity.location + "</span>";
            dayHTML += "</div>";
            dayHTML += "</div>";
            dayHTML += "</div>";

        });

        dayHTML += "</div>";
        container.innerHTML += dayHTML;

    });

}


function closeExpandedModal() {
    document.getElementById("expanded-plan-modal")
            .classList.add("hidden");
    currentOpenPlanId = null;
}


function trackPlan() {

    let userId = localStorage.getItem("userId");

    fetch("php/itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "trackPlan",
            planId: currentOpenPlanId,
            userId: userId
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        if (data.success) {

            /* Show the currently tracking badge */
            document.getElementById("currently-tracking-badge")
                    .classList.remove("hidden");

            /* Disable track button to prevent double-click */
            document.getElementById("track-btn").disabled = true;

            /* Refresh plan cards to show tracking badge on card */
            loadAllPlans();

            alert("Plan is now being tracked!");

        }

    });

}


/* ─────────────────────────────────────────────────
   SECTION 7 — DASHBOARD — DELETE PLAN
───────────────────────────────────────────────── */

/* Store which plan is pending deletion */
let planIdToDelete = null;


function openDeleteModal(event, planId, planName) {

    /* event.stopPropagation() prevents the click from
       also triggering openPlan() on the card below */
    event.stopPropagation();

    planIdToDelete = planId;

    /* Update the confirmation message with plan name */
    document.getElementById("delete-modal-message")
            .textContent = "Are you sure you want to delete \"" +
                           planName + "\"? " +
                           "This action cannot be undone.";

    /* Show the delete modal */
    document.getElementById("delete-modal")
            .classList.remove("hidden");

}


function closeDeleteModal() {
    document.getElementById("delete-modal")
            .classList.add("hidden");
    planIdToDelete = null;
}


function confirmDelete() {

    if (!planIdToDelete) { return; }

    fetch("php/itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "deletePlan",
            planId: planIdToDelete
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        if (data.success) {
            closeDeleteModal();
            /* Reload all plan cards to reflect deletion */
            loadAllPlans();
        }

    });

}


/* ─────────────────────────────────────────────────
   SECTION 8 — DASHBOARD — ADD PLAN
   Two-step process:
   Step 1 — user names the journey
   Step 2 — user builds days and activities
───────────────────────────────────────────────── */

/* Store the new plan name between steps */
let newPlanName = "";


function openAddPlanStep1() {
    /* Clear previous input if any */
    document.getElementById("new-plan-name-input").value = "";
    /* Show step 1 modal */
    document.getElementById("add-plan-modal-1")
            .classList.remove("hidden");
}


function closeAddPlanModal() {
    document.getElementById("add-plan-modal-1")
            .classList.add("hidden");
    document.getElementById("add-plan-modal-2")
            .classList.add("hidden");
    /* Clear the days container for next time */
    document.getElementById("add-days-container")
            .innerHTML = "";
    newPlanName = "";
}


function proceedToStep2() {

    let nameInput = document.getElementById(
        "new-plan-name-input"
    );

    /* Validate — name cannot be empty */
    if (nameInput.value.trim() === "") {
        alert("Please enter a name for your journey.");
        return;
    }

    newPlanName = nameInput.value.trim();

    /* Hide step 1, show step 2 */
    document.getElementById("add-plan-modal-1")
            .classList.add("hidden");
    document.getElementById("add-plan-modal-2")
            .classList.remove("hidden");

    /* Show plan name at top of step 2 */
    document.getElementById("add-plan-name-display")
            .value = newPlanName;

    /* Build the first day block automatically */
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


function addAnotherDay(mode) {

    /* mode is either "add" (new plan) or "edit" */
    let containerId = mode === "add" ?
                      "add-days-container" :
                      "edit-days-container";
    let container = document.getElementById(containerId);

    /* Count existing day blocks to determine next day number */
    let existingDays = container.querySelectorAll(".day-form-block");
    let dayNumber = existingDays.length + 1;

    /* Calculate the next date automatically */
    /* Find the last date input in the container */
    let dateInputs = container.querySelectorAll(".date-input");
    let nextDate = "";

    if (dateInputs.length > 0) {
        /* Get the last date value */
        let lastDate = dateInputs[dateInputs.length - 1].value;
        if (lastDate !== "") {
            /* Add 1 day to the last date */
            let dateObj = new Date(lastDate);
            dateObj.setDate(dateObj.getDate() + 1);
            /* Format back to YYYY-MM-DD for the input */
            nextDate = dateObj.toISOString().split("T")[0];
            /* .toISOString() gives "2026-05-08T00:00:00.000Z"
               .split("T")[0] takes just "2026-05-08" */
        }
    }

    /* Build the day block HTML */
    let dayBlock = "<div class='day-form-block'>";
    dayBlock += "<div class='day-form-header'>";
    dayBlock += "<div>";
    dayBlock += "<p class='day-form-date-label'>Date</p>";
    dayBlock += "<input type='date' class='date-input' " +
                "value='" + nextDate + "'>";
    dayBlock += "</div>";
    dayBlock += "<div>";
    dayBlock += "<p class='day-form-budget-label'>" +
                "Total Budget</p>";
    dayBlock += "<input type='number' class='budget-input' " +
                "placeholder='0'>";
    dayBlock += "</div>";
    dayBlock += "</div>";

    /* Activities label */
    dayBlock += "<p class='activities-label'>Activities</p>";

    /* One default empty activity row */
    dayBlock += buildActivityFormRow();

    /* Second default empty activity row */
    dayBlock += buildActivityFormRow();

    /* Add Activity button for this day */
    dayBlock += "<button class='add-activity-btn' " +
                "onclick='addActivityRow(this)'>" +
                "+ Add Activity</button>";

    dayBlock += "</div>";

    container.innerHTML += dayBlock;

    /* Update the day count display */
    updateDayCount(mode);

}


function buildActivityFormRow() {

    let row = "<div class='activity-form-block'>";
    row += "<input type='text' class='activity-desc-input' " +
           "placeholder='Activity description'>";
    row += "<div class='activity-time-location-row'>";
    row += "<input type='text' class='time-input' " +
           "placeholder='Time'>";
    row += "<input type='text' class='location-input' " +
           "placeholder='Location'>";
    row += "</div>";
    row += "</div>";

    return row;

}


function addActivityRow(button) {

    /* Find the day block this button belongs to */
    /* parentElement goes up one level in the HTML tree */
    let dayBlock = button.parentElement;

    /* Build a new activity row */
    let newRow = buildActivityFormRow();

    /* Insert before the Add Activity button */
    /* insertAdjacentHTML places HTML relative to an element */
    button.insertAdjacentHTML("beforebegin", newRow);

}


function updateDayCount(mode) {

    let containerId = mode === "add" ?
                      "add-days-container" :
                      "edit-days-container";
    let countId = mode === "add" ?
                  "add-days-count" :
                  "edit-days-count";

    let count = document.getElementById(containerId)
                        .querySelectorAll(".day-form-block")
                        .length;

    document.getElementById(countId).textContent = count;

}


function savePlan() {

    let userId = localStorage.getItem("userId");
    let planName = document.getElementById(
        "add-plan-name-display"
    ).value.trim();

    if (planName === "") {
        alert("Please enter a journey name.");
        return;
    }

    /* Collect all day data from the form */
    let days = collectDayData("add");

    if (days.length === 0) {
        alert("Please add at least one day.");
        return;
    }

    /* Send to PHP to save in database */
    fetch("php/itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "createPlan",
            userId: userId,
            planName: planName,
            days: days
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        if (data.success) {
            closeAddPlanModal();
            /* Reload cards to show the new plan */
            loadAllPlans();
        } else {
            alert(data.message);
        }

    });

}


function collectDayData(mode) {

    let containerId = mode === "add" ?
                      "add-days-container" :
                      "edit-days-container";
    let container = document.getElementById(containerId);
    let dayBlocks = container.querySelectorAll(".day-form-block");

    let days = [];

    dayBlocks.forEach(function(block) {

        let dateInput = block.querySelector(".date-input");
        let budgetInput = block.querySelector(".budget-input");
        let activityBlocks = block.querySelectorAll(
            ".activity-form-block"
        );

        let activities = [];

        activityBlocks.forEach(function(actBlock) {

            let desc = actBlock.querySelector(
                ".activity-desc-input"
            ).value.trim();

            /* Skip empty activity rows */
            if (desc === "") { return; }

            let time = actBlock.querySelector(
                ".time-input"
            ).value.trim();
            let location = actBlock.querySelector(
                ".location-input"
            ).value.trim();

            activities.push({
                activity_name: desc,
                activity_time: time,
                location: location
            });

        });

        days.push({
            day_date: dateInput.value,
            budget: budgetInput.value || 0,
            activities: activities
        });

    });

    return days;

}


/* ─────────────────────────────────────────────────
   SECTION 9 — DASHBOARD — EDIT PLAN
───────────────────────────────────────────────── */

function openEditModal() {

    /* Close the expanded modal first */
    document.getElementById("expanded-plan-modal")
            .classList.add("hidden");

    let userId = localStorage.getItem("userId");

    /* Fetch the plan data to pre-fill the edit form */
    fetch("php/itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "getPlan",
            planId: currentOpenPlanId,
            userId: userId
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        if (data.success) {
            populateEditModal(data.plan);
            document.getElementById("edit-plan-modal")
                    .classList.remove("hidden");
        }

    });

}


function populateEditModal(plan) {

    /* Set the plan name */
    document.getElementById("edit-plan-name-input")
            .value = plan.plan_name;

    /* Clear and rebuild day blocks with existing data */
    let container = document.getElementById(
        "edit-days-container"
    );
    container.innerHTML = "";

    plan.days.forEach(function(day) {

        let dayBlock = "<div class='day-form-block'>";
        dayBlock += "<div class='day-form-header'>";
        dayBlock += "<div>";
        dayBlock += "<p class='day-form-date-label'>Date</p>";
        /* Pre-fill with existing date */
        dayBlock += "<input type='date' class='date-input' " +
                    "value='" + day.day_date + "'>";
        dayBlock += "</div>";
        dayBlock += "<div>";
        dayBlock += "<p class='day-form-budget-label'>" +
                    "Total Budget</p>";
        /* Pre-fill with existing budget */
        dayBlock += "<input type='number' class='budget-input' " +
                    "value='" + day.budget + "'>";
        dayBlock += "</div>";
        dayBlock += "</div>";

        dayBlock += "<p class='activities-label'>Activities</p>";

        /* Pre-fill existing activities */
        day.activities.forEach(function(activity) {

            dayBlock += "<div class='activity-form-block'>";
            dayBlock += "<input type='text' " +
                        "class='activity-desc-input' " +
                        "value='" +
                        activity.activity_name + "'>";
            dayBlock += "<div class='activity-time-location-row'>";
            dayBlock += "<input type='text' class='time-input' " +
                        "value='" +
                        activity.activity_time + "'>";
            dayBlock += "<input type='text' " +
                        "class='location-input' " +
                        "value='" + activity.location + "'>";
            dayBlock += "</div>";
            dayBlock += "</div>";

        });

        dayBlock += "<button class='add-activity-btn' " +
                    "onclick='addActivityRow(this)'>" +
                    "+ Add Activity</button>";

        dayBlock += "</div>";
        container.innerHTML += dayBlock;

    });

    updateDayCount("edit");

}


function closeEditModal() {
    document.getElementById("edit-plan-modal")
            .classList.add("hidden");
}


function saveEditedPlan() {

    let planName = document.getElementById(
        "edit-plan-name-input"
    ).value.trim();

    if (planName === "") {
        alert("Please enter a journey name.");
        return;
    }

    let days = collectDayData("edit");

    fetch("php/itinerary.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "editPlan",
            planId: currentOpenPlanId,
            planName: planName,
            days: days
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        if (data.success) {
            closeEditModal();
            loadAllPlans();
        } else {
            alert(data.message);
        }

    });

}


/* ─────────────────────────────────────────────────
   SECTION 10 — ACCOUNT PAGE
───────────────────────────────────────────────── */

function initAccountPage() {

    let username = localStorage.getItem("username");

    /* Fill all username display elements */
    let displayUsername = document.getElementById(
        "display-username"
    );
    if (displayUsername) {
        displayUsername.textContent = username;
    }

    let viewUsername = document.getElementById("view-username");
    if (viewUsername) {
        viewUsername.textContent = username;
    }

    /* Fill edit input with current username */
    let editInput = document.getElementById(
        "edit-username-input"
    );
    if (editInput) {
        editInput.value = username;
    }

    /* Load journey stats from PHP */
    loadAccountStats();

}


function loadAccountStats() {

    let userId = localStorage.getItem("userId");

    fetch("php/auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "getStats",
            userId: userId
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        if (data.success) {

            document.getElementById("total-plans-count")
                    .textContent = data.totalPlans;
            document.getElementById("completed-count")
                    .textContent = data.completedCount;

        }

    });

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
    let icon = document.getElementById("eye-icon-img");
    let username = localStorage.getItem("username");

    /* If currently showing dots — reveal password */
    if (display.textContent.includes("•")) {
        /* Fetch real password from PHP session */
        fetch("php/auth.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "getPassword",
                userId: localStorage.getItem("userId")
            })
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                display.textContent = data.password;
            }
        });
    } else {
        /* Hide again — show dots */
        display.textContent = "••••••••";
    }

}


function saveProfileChanges() {

    let userId = localStorage.getItem("userId");
    let newUsername = document.getElementById(
        "edit-username-input"
    ).value.trim();
    let newPassword = document.getElementById(
        "edit-password-input"
    ).value.trim();

    if (newUsername === "") {
        alert("Username cannot be empty.");
        return;
    }

    fetch("php/auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "updateProfile",
            userId: userId,
            username: newUsername,
            password: newPassword
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        if (data.success) {
            /* Update localStorage with new username */
            localStorage.setItem("username", newUsername);
            alert("Profile updated successfully.");
            /* Reload page to show updated values */
            window.location.reload();
        } else {
            alert(data.message);
        }

    });

}


function openDeleteAccountModal() {
    document.getElementById("delete-account-modal")
            .classList.remove("hidden");
}


function closeDeleteAccountModal() {
    document.getElementById("delete-account-modal")
            .classList.add("hidden");
}


function confirmDeleteAccount() {

    let userId = localStorage.getItem("userId");

    fetch("php/auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "deleteAccount",
            userId: userId
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        if (data.success) {
            localStorage.clear();
            window.location.href = "signin.html";
        }

    });

}


/* ─────────────────────────────────────────────────
   SECTION 11 — ADMIN PAGES
───────────────────────────────────────────────── */

function initAdminPage() {

    /* Verify this user is actually an admin */
    let role = localStorage.getItem("role");
    if (role !== "admin") {
        /* Not an admin — redirect to homepage */
        window.location.href = "index.html";
        return;
    }

    /* Fill sidebar and welcome username */
    let username = localStorage.getItem("username");

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

    /* Load all statistics from PHP */
    loadAdminStats();

}


function loadAdminStats() {

    fetch("php/admin.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getStats" })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        if (data.success) {

            /* Fill the three stat cards */
            document.getElementById("stat-user-total")
                    .textContent = data.userTotal;
            document.getElementById("stat-itinerary-total")
                    .textContent = data.itineraryTotal;
            document.getElementById("stat-completion-total")
                    .textContent = data.completionTotal;

            /* Fill the four info boxes */
            document.getElementById("stat-popular-plan")
                    .textContent = data.popularPlan;
            document.getElementById("stat-popular-location")
                    .textContent = data.popularLocation;
            document.getElementById("stat-common-day")
                    .textContent = data.commonDay;
            document.getElementById("stat-common-length")
                    .textContent = data.commonLength;

            /* Fill the two teal boxes */
            document.getElementById("stat-active-username")
                    .textContent = data.activeUsername;
            document.getElementById("stat-active-plans")
                    .textContent = data.activePlans;
            document.getElementById("stat-tracked-count")
                    .textContent = data.trackedCount;

        }

    });

}


function initAdminAccountPage() {

    let role = localStorage.getItem("role");
    if (role !== "admin") {
        window.location.href = "index.html";
        return;
    }

    let username = localStorage.getItem("username");

    /* Fill all three username display elements */
    let sidebarName = document.getElementById(
        "admin-display-name"
    );
    if (sidebarName) {
        sidebarName.textContent = username;
    }

    let accountUsername = document.getElementById(
        "account-display-username"
    );
    if (accountUsername) {
        accountUsername.textContent = username;
    }

    let viewUsername = document.getElementById(
        "admin-view-username"
    );
    if (viewUsername) {
        viewUsername.textContent = username;
    }

    /* Pre-fill the edit input */
    let editInput = document.getElementById(
        "admin-edit-username"
    );
    if (editInput) {
        editInput.value = username;
    }

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


function saveAdminProfileChanges() {

    let userId = localStorage.getItem("userId");
    let newUsername = document.getElementById(
        "admin-edit-username"
    ).value.trim();
    let newPassword = document.getElementById(
        "admin-edit-password"
    ).value.trim();

    if (newUsername === "") {
        alert("Username cannot be empty.");
        return;
    }

    fetch("php/auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "updateProfile",
            userId: userId,
            username: newUsername,
            password: newPassword
        })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        if (data.success) {
            localStorage.setItem("username", newUsername);
            alert("Profile updated successfully.");
            window.location.reload();
        } else {
            alert(data.message);
        }

    });

}


function adminSignOut() {

    fetch("php/auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function() {
        localStorage.clear();
        window.location.href = "signin.html";
    });

}


/* ─────────────────────────────────────────────────
   SECTION 12 — UTILITY FUNCTIONS
   Small helper functions used across multiple sections.
───────────────────────────────────────────────── */

function formatCurrency(amount) {
    /* Formats a number as Philippine Peso currency */
    /* 1500 becomes "₱1,500" */
    return "₱" + parseFloat(amount).toLocaleString();
}


function formatDate(dateString) {
    /* Formats "2026-05-07" to "Thu, May 7" */
    let dateObj = new Date(dateString);
    return dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
    });
}

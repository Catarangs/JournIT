const SUPABASE_URL = 'https://vptvzuzydcweouodwvuy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_m1uCdwzt48lWw_WvGg23ag_nucwaJnz';

// Use 'let' so we can define it safely
let supabaseClient;

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Supabase library not loaded! Check your script tags in the HTML.");
}
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
   SECTION 4 — HOMEPAGE (Supabase Version)
───────────────────────────────────────────────── */

async function loadTrackedPlan() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    // 1. Fetch the plan marked as 'is_tracked = 1' for this user
    const { data: plan, error } = await supabaseClient
        .from('plans')
        .select(`
            *,
            days (*, activities (*))
        `)
        .eq('user_id', userId)
        .eq('is_tracked', 1)
        .single();

    if (error || !plan) {
        showNoPlanState();
    } else {
        showActivePlanState(plan);
    }
}

async function toggleActivity(checkbox) {
    const activityId = checkbox.getAttribute("data-id");
    const isDone = checkbox.checked; // This is already true or false

    // Update the visual appearance immediately
    const nameSpan = checkbox.parentElement.querySelector(".activity-name");
    isDone ? nameSpan.classList.add("completed") : nameSpan.classList.remove("completed");

    // 2. Update the 'activities' table in Supabase
    const { error } = await supabaseClient
        .from('activities')
        .update({ is_done: isDone }) // Database expects bool
        .eq('id', activityId);

    if (error) {
        console.error("Error toggling activity:", error.message);
    } else {
        // Refresh the progress bar on the homepage
        loadTrackedPlan();
    }
}

async function stopTracking() {
    const userId = localStorage.getItem("userId");

    // 3. Set 'is_tracked' to 0 for all plans of this user
    const { error } = await supabaseClient
        .from('plans')
        .update({ is_tracked: false })
        .eq('user_id', userId);

    if (!error) {
        updateCompletedCount();
        showNoPlanState();
    }
}

async function updateCompletedCount() {
    const userId = localStorage.getItem("userId");

    // 4. Fetch current count and increment in 'profiles' table
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('completed_itineraries')
        .eq('id', userId)
        .single();

    const newCount = (profile?.completed_itineraries || 0) + 1;

    await supabaseClient
        .from('profiles')
        .update({ completed_itineraries: newCount })
        .eq('id', userId);
}


/* ───────────────────────────────────────────────── 
   SECTION 5 — DASHBOARD — PLANS GRID 
   ───────────────────────────────────────────────── */

async function loadAllPlans() {
    // Get the ID of the user who just logged in
    const userId = localStorage.getItem("userId");
    
    if (!userId) {
        console.error("No user ID found. Redirecting to sign-in.");
        window.location.href = "signin.html";
        return;
    }

    // This replaces fetch("php/itinerary.php"...)
    const { data: plans, error } = await supabaseClient
        .from('plans') 
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error("Error loading plans:", error.message);
        return;
    }

    const grid = document.getElementById("plans-grid");
    grid.innerHTML = ""; 

    if (!plans || plans.length === 0) {
        // No plans yet — you can call a function to show an empty state here
        return;
    }

    // Build one card per plan using your existing buildPlanCard function
    plans.forEach(function(plan) {
        grid.innerHTML += buildPlanCard(plan);
    });
}

async function savePlan() {
    const planName = document.getElementById("plan-name-input").value.trim();
    const userId = localStorage.getItem("userId");

    if (!planName) {
        alert("Please enter a name for your journey.");
        return;
    }

    // This replaces the PHP 'create' action
    const { data, error } = await supabaseClient
        .from('plans')
        .insert([
            { 
                plan_name: planName, 
                user_id: userId,
                is_tracked: false 
            }
        ])
        .select();

    if (error) {
        alert("Error saving plan: " + error.message);
    } else {
        alert("Journey created!");
        closeModal(); // Call your existing function to close the popup
        loadAllPlans(); // Refresh the grid
    }
}


/* ─────────────────────────────────────────────────
   SECTION 6 — DASHBOARD — EXPANDED PLAN MODAL (Supabase)
───────────────────────────────────────────────── */

let currentOpenPlanId = null;

async function openPlan(cardElement) {
    let planId = cardElement.getAttribute("data-id");
    currentOpenPlanId = planId;
    let userId = localStorage.getItem("userId");

    // 1. Fetch full plan data + related days + related activities from Supabase
    const { data: plan, error } = await supabaseClient
        .from('plans')
        .select(`
            *,
            days (*, activities (*))
        `)
        .eq('id', planId)
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error("Error fetching full plan details:", error.message);
        return;
    }

    if (plan) {
        populateExpandedModal(plan);
        document.getElementById("expanded-plan-modal").classList.remove("hidden");
    }
}

function populateExpandedModal(plan) {
    document.getElementById("expanded-plan-name").textContent = plan.plan_name;

    let totalBudget = 0;
    // Calculate budget if 'days' exists and is an array
    if (plan.days) {
        plan.days.forEach(day => {
            totalBudget += parseFloat(day.budget || 0);
        });
    }

    document.getElementById("expanded-days-count").textContent = (plan.days ? plan.days.length : 0) + " Days";
    document.getElementById("expanded-budget").textContent = "₱" + totalBudget.toLocaleString();

    let badge = document.getElementById("currently-tracking-badge");
    if (plan.is_tracked == 1) {
        badge.classList.remove("hidden");
        document.getElementById("track-btn").disabled = true;
    } else {
        badge.classList.add("hidden");
        document.getElementById("track-btn").disabled = false;
    }

    let container = document.getElementById("expanded-days-content");
    container.innerHTML = "";

    if (plan.days) {
        plan.days.forEach(day => {
            let dateObj = new Date(day.day_date);
            let formatted = dateObj.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric"
            });

            let dayHTML = `<div class='day-box'>
                <div class='day-header-row'>
                    <span class='day-date-label'>${formatted}</span>
                    <span class='day-budget-badge'>₱${parseFloat(day.budget || 0).toLocaleString()}</span>
                </div>`;

            if (day.activities) {
                day.activities.forEach(activity => {
                    let checked = activity.is_done == 1 ? "checked" : "";
                    let doneClass = activity.is_done == 1 ? "completed" : "";

                    dayHTML += `
                        <div class='activity-row'>
                            <input type='checkbox' class='activity-checkbox' 
                                   data-id='${activity.id}' ${checked} 
                                   onchange='toggleActivity(this)'>
                            <div class='activity-details'>
                                <span class='activity-name ${doneClass}'>${activity.activity_name}</span>
                                <div class='activity-meta'>
                                    <span class='activity-time'>${activity.activity_time}</span>
                                    <span class='activity-location'>${activity.location}</span>
                                </div>
                            </div>
                        </div>`;
                });
            }
            dayHTML += "</div>";
            container.innerHTML += dayHTML;
        });
    }
}

function closeExpandedModal() {
    document.getElementById("expanded-plan-modal").classList.add("hidden");
    currentOpenPlanId = null;
}

async function trackPlan() {
    let userId = localStorage.getItem("userId");

    // 1. First, untrack any currently tracked plan for this user
    await supabaseClient
        .from('plans')
        .update({ is_tracked: false })
        .eq('user_id', userId);

    // 2. Set the current plan to tracked
    const { error } = await supabaseClient
        .from('plans')
        .update({ is_tracked: true })
        .eq('id', currentOpenPlanId);

    if (error) {
        alert("Error tracking plan: " + error.message);
    } else {
        document.getElementById("currently-tracking-badge").classList.remove("hidden");
        document.getElementById("track-btn").disabled = true;
        loadAllPlans(); // Refresh the grid to show the new badge
        alert("Plan is now being tracked!");
    }
}


/* ─────────────────────────────────────────────────
   SECTION 7 — DASHBOARD — DELETE PLAN (Supabase)
───────────────────────────────────────────────── */

let planIdToDelete = null;

function openDeleteModal(event, planId, planName) {
    event.stopPropagation();
    planIdToDelete = planId;
    document.getElementById("delete-modal-message").textContent = 
        `Are you sure you want to delete "${planName}"? This action cannot be undone.`;
    document.getElementById("delete-modal").classList.remove("hidden");
}

function closeDeleteModal() {
    document.getElementById("delete-modal").classList.add("hidden");
    planIdToDelete = null;
}

async function confirmDelete() {
    if (!planIdToDelete) return;

    // Supabase cascade delete: If you set up Foreign Keys with 'ON DELETE CASCADE', 
    // deleting the plan will automatically delete its days and activities.
    const { error } = await supabaseClient
        .from('plans')
        .delete()
        .eq('id', planIdToDelete);

    if (error) {
        alert("Error deleting plan: " + error.message);
    } else {
        closeDeleteModal();
        loadAllPlans();
    }
}

/* ─────────────────────────────────────────────────
   SECTION 8 — DASHBOARD — ADD PLAN (Supabase)
───────────────────────────────────────────────── */

let newPlanName = "";

function openAddPlanStep1() {
    document.getElementById("new-plan-name-input").value = "";
    document.getElementById("add-plan-modal-1").classList.remove("hidden");
}

function closeAddPlanModal() {
    document.getElementById("add-plan-modal-1").classList.add("hidden");
    document.getElementById("add-plan-modal-2").classList.add("hidden");
    document.getElementById("add-days-container").innerHTML = "";
    newPlanName = "";
}

function proceedToStep2() {
    let nameInput = document.getElementById("new-plan-name-input");
    if (nameInput.value.trim() === "") {
        alert("Please enter a name for your journey.");
        return;
    }
    newPlanName = nameInput.value.trim();
    document.getElementById("add-plan-modal-1").classList.add("hidden");
    document.getElementById("add-plan-modal-2").classList.remove("hidden");
    document.getElementById("add-plan-name-display").value = newPlanName;
    document.getElementById("add-days-container").innerHTML = "";
    addAnotherDay("add");
}

// ... Keep your existing backToStep1, addAnotherDay, buildActivityFormRow, 
// addActivityRow, updateDayCount, and collectDayData functions as they are 
// UI-only and don't involve fetch ...

async function savePlan() {
    const userId = localStorage.getItem("userId");
    const planName = document.getElementById("add-plan-name-display").value.trim();
    const days = collectDayData("add");

    if (planName === "") { alert("Please enter a journey name."); return; }
    if (days.length === 0) { alert("Please add at least one day."); return; }

    // 1. Create the Plan
    const { data: planData, error: planError } = await supabaseClient
        .from('plans')
        .insert([{ plan_name: planName, user_id: userId, is_tracked: false }])
        .select()
        .single();

    if (planError) { alert("Error creating plan: " + planError.message); return; }

    const planId = planData.id;

    // 2. Loop through days and their activities
    for (const day of days) {
        const { data: dayData, error: dayError } = await supabaseClient
            .from('days')
            .insert([{ plan_id: planId, day_date: day.day_date, budget: day.budget }])
            .select()
            .single();

        if (dayError) { console.error("Error creating day:", dayError); continue; }

        const dayId = dayData.id;

        // 3. Insert activities for this day
        if (day.activities.length > 0) {
            const activitiesToInsert = day.activities.map(act => ({
                day_id: dayId,
                activity_name: act.activity_name,
                activity_time: act.activity_time,
                location: act.location,
                is_done: 0
            }));

            const { error: actError } = await supabaseClient
                .from('activities')
                .insert(activitiesToInsert);
            
            if (actError) console.error("Error creating activities:", actError);
        }
    }

    alert("Journey saved successfully!");
    closeAddPlanModal();
    loadAllPlans();
}

/* ─────────────────────────────────────────────────
   SECTION 9 — DASHBOARD — EDIT PLAN (Supabase)
───────────────────────────────────────────────── */

async function openEditModal() {
    document.getElementById("expanded-plan-modal").classList.add("hidden");
    let userId = localStorage.getItem("userId");

    // Fetch the plan data + related days + activities to pre-fill the form
    const { data: plan, error } = await supabaseClient
        .from('plans')
        .select(`*, days (*, activities (*))`)
        .eq('id', currentOpenPlanId)
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error("Error fetching plan for edit:", error.message);
    } else {
        populateEditModal(plan);
        document.getElementById("edit-plan-modal").classList.remove("hidden");
    }
}

function populateEditModal(plan) {
    document.getElementById("edit-plan-name-input").value = plan.plan_name;
    let container = document.getElementById("edit-days-container");
    container.innerHTML = "";

    if (plan.days) {
        plan.days.forEach(day => {
            let dayBlock = `<div class='day-form-block'>
                <div class='day-form-header'>
                    <div>
                        <p class='day-form-date-label'>Date</p>
                        <input type='date' class='date-input' value='${day.day_date}'>
                    </div>
                    <div>
                        <p class='day-form-budget-label'>Total Budget</p>
                        <input type='number' class='budget-input' value='${day.budget}'>
                    </div>
                </div>
                <p class='activities-label'>Activities</p>`;

            if (day.activities) {
                day.activities.forEach(activity => {
                    dayBlock += `<div class='activity-form-block'>
                        <input type='text' class='activity-desc-input' value='${activity.activity_name}'>
                        <div class='activity-time-location-row'>
                            <input type='text' class='time-input' value='${activity.activity_time}'>
                            <input type='text' class='location-input' value='${activity.location}'>
                        </div>
                    </div>`;
                });
            }

            dayBlock += `<button class='add-activity-btn' onclick='addActivityRow(this)'>+ Add Activity</button></div>`;
            container.innerHTML += dayBlock;
        });
    }
    updateDayCount("edit");
}

function closeEditModal() {
    document.getElementById("edit-plan-modal").classList.add("hidden");
}

async function saveEditedPlan() {
    let planName = document.getElementById("edit-plan-name-input").value.trim();
    if (planName === "") { alert("Please enter a journey name."); return; }

    let days = collectDayData("edit");

    // 1. Update the Plan Name
    await supabaseClient.from('plans').update({ plan_name: planName }).eq('id', currentOpenPlanId);

    // 2. Delete old days (this will cascade delete old activities) to perform a clean sync
    await supabaseClient.from('days').delete().eq('plan_id', currentOpenPlanId);

    // 3. Re-insert the updated days and activities
    for (const day of days) {
        const { data: dayData } = await supabaseClient
            .from('days')
            .insert([{ plan_id: currentOpenPlanId, day_date: day.day_date, budget: day.budget }])
            .select().single();

        if (day.activities.length > 0) {
            const acts = day.activities.map(a => ({
                day_id: dayData.id,
                activity_name: a.activity_name,
                activity_time: a.activity_time,
                location: a.location
            }));
            await supabaseClient.from('activities').insert(acts);
        }
    }

    closeEditModal();
    loadAllPlans();
}

/* ─────────────────────────────────────────────────
   SECTION 10 — ACCOUNT PAGE (Supabase)
───────────────────────────────────────────────── */

async function initAccountPage() {
    let username = localStorage.getItem("username");
    
    // Fill displays
    ["display-username", "view-username"].forEach(id => {
        let el = document.getElementById(id);
        if (el) el.textContent = username;
    });

    let editInput = document.getElementById("edit-username-input");
    if (editInput) editInput.value = username;

    loadAccountStats();
}

async function loadAccountStats() {
    let userId = localStorage.getItem("userId");

    const { count: totalPlans } = await supabaseClient
        .from('plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('completed_count') // Changed from completed_itineraries
        .eq('id', userId)
        .single();

    document.getElementById("total-plans-count").textContent = totalPlans || 0;
    document.getElementById("completed-count").textContent = profile?.completed_count || 0;
}

async function saveProfileChanges() {
    let userId = localStorage.getItem("userId");
    let newUsername = document.getElementById("edit-username-input").value.trim();
    let newPassword = document.getElementById("edit-password-input").value.trim();

    if (newUsername === "") { alert("Username cannot be empty."); return; }

    // Update Profile Table
    const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', userId);

    // If password was provided, update Supabase Auth
    if (newPassword !== "") {
        const { error: authError } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (authError) alert("Password Update Error: " + authError.message);
    }

    if (!profileError) {
        localStorage.setItem("username", newUsername);
        alert("Profile updated successfully.");
        window.location.reload();
    }
}

async function confirmDeleteAccount() {
    let userId = localStorage.getItem("userId");

    // In Supabase, you usually delete the user via Auth API
    // This requires an edge function or admin rights, so for now, we clear the session
    const { error } = await supabaseClient.auth.signOut();
    
    if (!error) {
        localStorage.clear();
        window.location.href = "signin.html";
    }
}

/* ─────────────────────────────────────────────────
   SECTION 11 — ADMIN PAGES (Supabase)
───────────────────────────────────────────────── */

async function initAdminPage() {
    const userId = localStorage.getItem("userId");
    
    // 1. Verify role from the database for security
    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('role, username')
        .eq('id', userId)
        .single();

    if (error || profile.role !== "admin") {
        alert("Access Denied: Admin only.");
        window.location.href = "index.html";
        return;
    }

    // 2. Fill Display Names
    const username = profile.username;
    const sidebarName = document.getElementById("admin-display-name");
    if (sidebarName) sidebarName.textContent = username;

    const welcomeName = document.getElementById("admin-welcome-name");
    if (welcomeName) welcomeName.textContent = username;

    // 3. Load stats
    loadAdminStats();
}

async function loadAdminStats() {
    // Total Users
    const { count: userTotal } = await supabaseClient
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    // Total Plans
    const { count: itineraryTotal } = await supabaseClient
        .from('plans')
        .select('*', { count: 'exact', head: true });

    // Total Completed Plans (Using the boolean column from your schema)
    const { count: completionTotal } = await supabaseClient
        .from('plans')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', true);

    // Tracked Plans Count
    const { count: trackedCount } = await supabaseClient
        .from('plans')
        .select('*', { count: 'exact', head: true })
        .eq('is_tracked', true);

    // Fill UI Cards
    document.getElementById("stat-user-total").textContent = userTotal || 0;
    document.getElementById("stat-itinerary-total").textContent = itineraryTotal || 0;
    document.getElementById("stat-completion-total").textContent = completionTotal || 0;
    document.getElementById("stat-tracked-count").textContent = trackedCount || 0;

    // Placeholder Logic for Advanced Stats 
    // (Supabase requires custom RPC functions for complex "popular" aggregations)
    document.getElementById("stat-popular-plan").textContent = "Beach Getaway";
    document.getElementById("stat-popular-location").textContent = "Boracay";
}

async function initAdminAccountPage() {
    const userId = localStorage.getItem("userId");
    
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('username, role')
        .eq('id', userId)
        .single();

    if (!profile || profile.role !== "admin") {
        window.location.href = "index.html";
        return;
    }

    const username = profile.username;
    ["admin-display-name", "account-display-username", "admin-view-username"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = username;
    });

    const editInput = document.getElementById("admin-edit-username");
    if (editInput) editInput.value = username;
}

async function saveAdminProfileChanges() {
    const userId = localStorage.getItem("userId");
    const newUsername = document.getElementById("admin-edit-username").value.trim();
    const newPassword = document.getElementById("admin-edit-password").value.trim();

    if (newUsername === "") {
        alert("Username cannot be empty.");
        return;
    }

    // Update Profile
    const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', userId);

    // Update Password in Auth if provided
    if (newPassword !== "") {
        await supabaseClient.auth.updateUser({ password: newPassword });
    }

    if (!profileError) {
        localStorage.setItem("username", newUsername);
        alert("Admin profile updated successfully.");
        window.location.reload();
    }
}

async function adminSignOut() {
    await supabaseClient.auth.signOut();
    localStorage.clear();
    window.location.href = "signin.html";
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

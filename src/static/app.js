document.addEventListener("DOMContentLoaded", () => {

  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Create filter/search UI if not present
  let searchInput = document.getElementById("search-input");
  let categoryFilter = document.getElementById("category-filter");
  let sortFilter = document.getElementById("sort-filter");

  // If missing, inject filter/search UI above the activities list
  if (!searchInput || !categoryFilter || !sortFilter) {
    const filterBar = document.createElement("div");
    filterBar.id = "filter-bar";
    filterBar.style.display = "flex";
    filterBar.style.gap = "1em";
    filterBar.style.marginBottom = "1em";

    // Search input
    if (!searchInput) {
      searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.id = "search-input";
      searchInput.placeholder = "Search activities...";
      filterBar.appendChild(searchInput);
    }

    // Category filter
    if (!categoryFilter) {
      categoryFilter = document.createElement("select");
      categoryFilter.id = "category-filter";
      filterBar.appendChild(categoryFilter);
    }

    // Sort filter
    if (!sortFilter) {
      sortFilter = document.createElement("select");
      sortFilter.id = "sort-filter";
      sortFilter.innerHTML = `
        <option value="name">Sort by Name</option>
        <option value="time">Sort by Time</option>
      `;
      filterBar.appendChild(sortFilter);
    }

    // Insert filter bar before activities list
    if (activitiesList && activitiesList.parentNode) {
      activitiesList.parentNode.insertBefore(filterBar, activitiesList);
    }
  }

  let allActivities = {};

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;
      renderCategoryOptions(activities);
      renderActivities();
      renderActivitySelect(activities);
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Render category options based on activities
  function renderCategoryOptions(activities) {
    if (!categoryFilter) return;
    const categories = new Set();
    Object.values(activities).forEach((details) => {
      if (details.category) categories.add(details.category);
    });
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    Array.from(categories)
      .sort()
      .forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        categoryFilter.appendChild(opt);
      });
  }

  // Render activity select dropdown for signup form
  function renderActivitySelect(activities) {
    if (!activitySelect) return;
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    Object.keys(activities).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
  }

  // Render activities with filters, sort, and search
  function renderActivities() {
    let filtered = Object.entries(allActivities);

    // Filter by category
    const selectedCategory = categoryFilter?.value || "";
    if (selectedCategory) {
      filtered = filtered.filter(([, details]) => details.category === selectedCategory);
    }

    // Search by name or description
    const search = searchInput?.value?.toLowerCase() || "";
    if (search) {
      filtered = filtered.filter(([name, details]) =>
        name.toLowerCase().includes(search) ||
        (details.description && details.description.toLowerCase().includes(search))
      );
    }

    // Sort
    const sortBy = sortFilter?.value || "name";
    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a[0].localeCompare(b[0]);
      } else if (sortBy === "time") {
        // Assume details.schedule is a string, try to sort by it
        return (a[1].schedule || "").localeCompare(b[1].schedule || "");
      }
      return 0;
    });

    // Render
    activitiesList.innerHTML = "";
    if (filtered.length === 0) {
      activitiesList.innerHTML = "<p>No activities found.</p>";
      return;
    }
    filtered.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });


  // Event listeners for filters
  if (searchInput) searchInput.addEventListener("input", renderActivities);
  if (categoryFilter) categoryFilter.addEventListener("change", renderActivities);
  if (sortFilter) sortFilter.addEventListener("change", renderActivities);

  // Initialize app
  fetchActivities();
});

const API_URL = "https://jsonplaceholder.typicode.com/users";

const loadBtn = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusText = document.querySelector("#status");
const list = document.querySelector("#users-list");

// The single source of truth: every user we loaded from the server
let users = [];

// Draw any array of users on the page
function renderUsers(userList) {
  list.innerHTML = ""; // safe: no user text is inserted here

  if (userList.length === 0) {
    // Only show the "no match" message after users have been loaded
    if (users.length > 0) {
      statusText.textContent = "No users match your filter.";
    }
    return;
  }

  userList.forEach((user) => {
    const li = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const details = document.createElement("span");
    details.textContent =
      ` - ${user.email} | ${user.address.city} | ${user.company.name}`;

    li.appendChild(name);
    li.appendChild(details);
    list.appendChild(li);
  });

  if (users.length > 0) {
    statusText.textContent = `Showing ${userList.length} of ${users.length} users.`;
  }
}

// Fetch users from the API
async function loadUsers() {
  statusText.textContent = "Loading users...";
  loadBtn.disabled = true;
  list.innerHTML = "";

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    users = await response.json();
    filterInput.value = ""; // start fresh after each load
    renderUsers(users);
    statusText.textContent = `Loaded ${users.length} users.`;
  } catch (error) {
    users = [];
    statusText.textContent = "Could not load users. Please try again.";
    console.error(error);
  } finally {
    loadBtn.disabled = false; // runs on success and on failure
  }
}

// Filter the stored array: no new request is made
function handleFilter() {
  const searchText = filterInput.value.trim().toLowerCase();

  const matches = users.filter((user) =>
    user.name.toLowerCase().includes(searchText)
  );

  renderUsers(matches);
}

loadBtn.addEventListener("click", loadUsers);
filterInput.addEventListener("input", handleFilter);
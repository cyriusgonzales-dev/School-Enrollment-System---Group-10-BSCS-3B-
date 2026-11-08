// Alvarez Academy Crest - Enrollment System (script.js)

let settings = {};      // school year, semester, tracks
let enrollments = [];   // all applications
let students = [];      // approved students
let sections = [];      // sections

// ===== Helper functions =====

// Send a request to the server and get the JSON answer
async function api(url, method, body) {
  const options = { method: "GET", headers: { "Content-Type": "application/json" } };
  if (method) {
    options.method = method;
  }
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message);
  }
  return data;
}

// Short way to get an element by its id
function el(id) {
  return document.getElementById(id);
}

// Stop HTML tags typed by users from running on the page
function safe(text) {
  return String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Colored status label
function badge(status) {
  return "<span class='badge " + status + "'>" + status + "</span>";
}

// Put options inside a <select>
function fillOptions(select, list, firstText, selected) {
  let html = "";
  if (firstText) {
    html = "<option value=''>" + firstText + "</option>";
  }
  for (let i = 0; i < list.length; i++) {
    if (list[i] === selected) {
      html += "<option selected>" + list[i] + "</option>";
    } else {
      html += "<option>" + list[i] + "</option>";
    }
  }
  select.innerHTML = html;
}

// Get the names of all tracks
function getTracks() {
  return Object.keys(settings.tracks);
}

// Get all strands from all tracks
function getAllStrands() {
  const tracks = getTracks();
  let strands = [];
  for (let i = 0; i < tracks.length; i++) {
    strands = strands.concat(settings.tracks[tracks[i]]);
  }
  return strands;
}

// ===== Start of every page =====
async function start() {
  settings = await api("/api/settings");

  // Show school year and semester on the page
  const years = document.getElementsByClassName("sy");
  for (let i = 0; i < years.length; i++) {
    years[i].innerHTML = "SY " + settings.schoolYear;
  }
  const sems = document.getElementsByClassName("sem");
  for (let i = 0; i < sems.length; i++) {
    sems[i].innerHTML = settings.semester;
  }

  // Run the code for the current page
  const page = document.body.getAttribute("data-page");
  if (page === "enrollment") {
    setupEnrollment();
  } else if (page === "status") {
    setupStatus();
  } else if (page === "admin") {
    setupAdmin();
  }
}

start();

// ===== Enrollment page =====
function setupEnrollment() {
  fillOptions(el("track"), getTracks(), "Select");

  // When a track is chosen, show only its strands
  el("track").addEventListener("change", function () {
    const track = el("track").value;
    if (track === "") {
      fillOptions(el("strand"), [], "Select a track first");
    } else {
      fillOptions(el("strand"), settings.tracks[track], "Select");
    }
  });

  el("enrollForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const data = {
      fullName: el("fullName").value,
      dateOfBirth: el("dateOfBirth").value,
      sex: el("sex").value,
      address: el("address").value,
      contactNumber: el("contactNumber").value,
      gradeLevel: el("gradeLevel").value,
      track: el("track").value,
      strand: el("strand").value
    };

    try {
      const record = await api("/api/enrollments", "POST", data);
      el("enrollForm").style.display = "none";
      el("refNumber").innerHTML = record.referenceNumber;
      el("success").style.display = "block";
    } catch (error) {
      el("message").innerHTML = error.message;
    }
  });
}

// ===== Status page =====
function setupStatus() {
  el("statusForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    el("message").innerHTML = "";
    el("result").style.display = "none";

    try {
      const r = await api("/api/status/" + el("reference").value.trim());
      let html = "<h3>" + safe(r.fullName) + "</h3>";
      html += "<table class='details'>";
      html += "<tr><th>Reference Number</th><td>" + r.referenceNumber + "</td></tr>";
      html += "<tr><th>Grade Level</th><td>" + r.gradeLevel + "</td></tr>";
      html += "<tr><th>Track</th><td>" + r.track + "</td></tr>";
      html += "<tr><th>Strand</th><td>" + r.strand + "</td></tr>";
      html += "<tr><th>School Year</th><td>SY " + r.schoolYear + "</td></tr>";
      html += "<tr><th>Status</th><td>" + badge(r.status) + "</td></tr>";
      html += "</table>";
      el("result").innerHTML = html;
      el("result").style.display = "block";
    } catch (error) {
      el("message").innerHTML = error.message;
    }
  });
}

// ===== Admin page =====
function setupAdmin() {
  // DEMO login only. It is remembered in sessionStorage (not real security).
  if (sessionStorage.getItem("admin") === "yes") {
    showAdmin();
  }

  el("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      await api("/api/login", "POST", { username: el("username").value, password: el("password").value });
      sessionStorage.setItem("admin", "yes");
      showAdmin();
    } catch (error) {
      el("message").innerHTML = error.message;
    }
  });

  el("logout").addEventListener("click", function () {
    sessionStorage.removeItem("admin");
    location.reload();
  });

  // Fill the filter dropdowns
  fillOptions(el("fTrack"), getTracks(), "All Tracks");
  fillOptions(el("sTrack"), getTracks(), "All Tracks");
  fillOptions(el("fStrand"), getAllStrands(), "All Strands");
  fillOptions(el("sStrand"), getAllStrands(), "All Strands");
  fillOptions(el("subStrand"), getAllStrands());
}

async function showAdmin() {
  el("loginPage").style.display = "none";
  el("adminPage").style.display = "block";
  await loadData();
  showSubjects();
}

// Get the latest data from the server and show it in the tables
async function loadData() {
  enrollments = await api("/api/enrollments");
  students = await api("/api/students");
  sections = await api("/api/sections");
  showDashboard();
  showApplications();
  showStudents();
  showSections();
}

// Show one part of the admin page and hide the others
function showView(name) {
  const views = ["dashboard", "applications", "students", "sections", "subjects"];
  for (let i = 0; i < views.length; i++) {
    el(views[i]).style.display = "none";
    el("link-" + views[i]).className = "";
  }
  el(name).style.display = "block";
  el("link-" + name).className = "active";
  el("title").innerHTML = el("link-" + name).innerHTML;
}

// Make one table row for an application
function applicationRow(a) {
  let row = "<tr>";
  row += "<td>" + a.referenceNumber + "</td>";
  row += "<td>" + safe(a.fullName) + "</td>";
  row += "<td>" + a.gradeLevel + "</td>";
  row += "<td>" + a.track + "</td>";
  row += "<td>" + a.strand + "</td>";
  row += "<td>" + a.dateSubmitted + "</td>";
  row += "<td>" + badge(a.status) + "</td>";
  row += "<td><button onclick='viewApplication(" + a.id + ")'>View</button> ";
  row += "<button onclick='editApplication(" + a.id + ")'>Edit</button></td>";
  row += "</tr>";
  return row;
}

// Dashboard: counts and recent applications
function showDashboard() {
  let pending = 0;
  let approved = 0;
  let denied = 0;
  let rows = "";

  for (let i = 0; i < enrollments.length; i++) {
    if (enrollments[i].status === "Pending") {
      pending++;
    } else if (enrollments[i].status === "Approved") {
      approved++;
    } else {
      denied++;
    }
    if (i < 10) {
      rows += applicationRow(enrollments[i]);
    }
  }

  el("total").innerHTML = enrollments.length;
  el("pending").innerHTML = pending;
  el("approved").innerHTML = approved;
  el("denied").innerHTML = denied;

  if (rows === "") {
    rows = "<tr><td colspan='8'>No applications yet.</td></tr>";
  }
  el("recentTable").innerHTML = rows;
}

// Applications table with search and filters
function showApplications() {
  const search = el("search").value.toLowerCase();
  const grade = el("fGrade").value;
  const track = el("fTrack").value;
  const strand = el("fStrand").value;
  const status = el("fStatus").value;
  let rows = "";

  for (let i = 0; i < enrollments.length; i++) {
    const a = enrollments[i];
    const name = a.fullName.toLowerCase();
    const ref = a.referenceNumber.toLowerCase();

    if (name.indexOf(search) === -1 && ref.indexOf(search) === -1) continue;
    if (grade !== "" && a.gradeLevel !== grade) continue;
    if (track !== "" && a.track !== track) continue;
    if (strand !== "" && a.strand !== strand) continue;
    if (status !== "" && a.status !== status) continue;

    rows += applicationRow(a);
  }

  if (rows === "") {
    rows = "<tr><td colspan='8'>No applications found.</td></tr>";
  }
  el("appTable").innerHTML = rows;
}

// Students table (approved only) with search and filters
function showStudents() {
  const search = el("sSearch").value.toLowerCase();
  const grade = el("sGrade").value;
  const track = el("sTrack").value;
  const strand = el("sStrand").value;
  let rows = "";

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const name = s.fullName.toLowerCase();
    const id = s.studentId.toLowerCase();

    if (name.indexOf(search) === -1 && id.indexOf(search) === -1) continue;
    if (grade !== "" && s.gradeLevel !== grade) continue;
    if (track !== "" && s.track !== track) continue;
    if (strand !== "" && s.strand !== strand) continue;

    rows += "<tr>";
    rows += "<td>" + s.studentId + "</td>";
    rows += "<td>" + safe(s.fullName) + "</td>";
    rows += "<td>" + s.gradeLevel + "</td>";
    rows += "<td>" + s.track + "</td>";
    rows += "<td>" + s.strand + "</td>";
    rows += "<td>" + s.section + "</td>";
    rows += "<td>SY " + s.schoolYear + "</td>";
    rows += "<td>" + s.semester + "</td>";
    rows += "<td><button onclick='viewApplication(" + s.id + ")'>View</button> ";
    rows += "<button onclick='editApplication(" + s.id + ")'>Edit</button></td>";
    rows += "</tr>";
  }

  if (rows === "") {
    rows = "<tr><td colspan='9'>No approved students found.</td></tr>";
  }
  el("studentTable").innerHTML = rows;
}

// Sections table
function showSections() {
  let rows = "";

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    rows += "<tr>";
    rows += "<td><b>" + s.name + "</b></td>";
    rows += "<td>" + s.gradeLevel + "</td>";
    rows += "<td>" + s.track + "</td>";
    rows += "<td>" + s.strand + "</td>";
    rows += "<td>SY " + s.schoolYear + "</td>";
    rows += "<td>" + s.semester + "</td>";
    rows += "<td>" + s.students.length + "</td>";
    rows += "<td>" + s.capacity + "</td>";
    rows += "<td>" + (s.capacity - s.students.length) + "</td>";
    rows += "<td><button onclick='viewSection(" + i + ")'>Students</button></td>";
    rows += "</tr>";
  }

  if (rows === "") {
    rows = "<tr><td colspan='10'>No sections yet. Sections are made when students are approved.</td></tr>";
  }
  el("sectionTable").innerHTML = rows;
}

// Subjects list
async function showSubjects() {
  const url = "/api/subjects?gradeLevel=" + el("subGrade").value +
              "&strand=" + encodeURIComponent(el("subStrand").value) +
              "&semester=" + el("subSemester").value;
  const subjects = await api(url);

  let html = "";
  for (let i = 0; i < subjects.length; i++) {
    html += "<li>" + subjects[i] + "</li>";
  }
  el("subjectList").innerHTML = html;
}

// ===== Popup window =====
function openPopup(html) {
  el("popupBox").innerHTML = html;
  el("popup").style.display = "block";
}

function closePopup() {
  el("popup").style.display = "none";
}

// Show all details of one application
async function viewApplication(id) {
  const a = await api("/api/enrollments/" + id);

  let subjects = "Assigned after approval";
  if (a.subjects.length > 0) {
    subjects = a.subjects.join("<br>");
  }

  let html = "<h2>" + safe(a.fullName) + " " + badge(a.status) + "</h2>";
  html += "<table class='details'>";
  html += "<tr><th>Reference No.</th><td>" + a.referenceNumber + "</td></tr>";
  html += "<tr><th>Date of Birth</th><td>" + a.dateOfBirth + "</td></tr>";
  html += "<tr><th>Sex</th><td>" + a.sex + "</td></tr>";
  html += "<tr><th>Address</th><td>" + safe(a.address) + "</td></tr>";
  html += "<tr><th>Contact Number</th><td>" + a.contactNumber + "</td></tr>";
  html += "<tr><th>Grade Level</th><td>" + a.gradeLevel + "</td></tr>";
  html += "<tr><th>Track / Strand</th><td>" + a.track + " / " + a.strand + "</td></tr>";
  html += "<tr><th>School Year</th><td>SY " + a.schoolYear + " - " + a.semester + "</td></tr>";
  html += "<tr><th>Student ID</th><td>" + (a.studentId || "-") + "</td></tr>";
  html += "<tr><th>Section</th><td>" + (a.section || "-") + "</td></tr>";
  html += "<tr><th>Subjects</th><td>" + subjects + "</td></tr>";
  html += "</table>";

  // Buttons (there is no delete button on purpose)
  html += "<p class='buttons'>";
  html += "<button onclick='closePopup()'>Close</button> ";
  html += "<button onclick='editApplication(" + a.id + ")'>Edit</button> ";
  if (a.status !== "Denied") {
    html += "<button class='red' onclick='changeStatus(" + a.id + ", \"Denied\")'>Deny</button> ";
  }
  if (a.status !== "Approved") {
    html += "<button class='green' onclick='changeStatus(" + a.id + ", \"Approved\")'>Approve</button>";
  }
  html += "</p>";

  openPopup(html);
}

// Approve or deny an application
async function changeStatus(id, status) {
  if (confirm("Mark this application as " + status + "?")) {
    await api("/api/enrollments/" + id, "PUT", { status: status });
    await loadData();
    viewApplication(id);
  }
}

// Show the edit form
async function editApplication(id) {
  const a = await api("/api/enrollments/" + id);

  let html = "<h2>Edit Application</h2>";
  html += "<label>Full Name</label><input id='eFullName' value='" + safe(a.fullName).replace(/'/g, "&#39;") + "'>";
  html += "<label>Date of Birth</label><input type='date' id='eDateOfBirth' value='" + a.dateOfBirth + "'>";
  html += "<label>Sex</label><select id='eSex'></select>";
  html += "<label>Address</label><input id='eAddress' value='" + safe(a.address).replace(/'/g, "&#39;") + "'>";
  html += "<label>Contact Number</label><input id='eContactNumber' maxlength='11' value='" + a.contactNumber + "'>";
  html += "<label>Grade Level</label><select id='eGradeLevel'></select>";
  html += "<label>Track</label><select id='eTrack' onchange='editTrackChanged()'></select>";
  html += "<label>Strand</label><select id='eStrand'></select>";
  html += "<label>Semester</label><select id='eSemester'></select>";
  html += "<p id='editMessage' class='message'></p>";
  html += "<p class='buttons'>";
  html += "<button onclick='closePopup()'>Cancel</button> ";
  html += "<button class='navy' onclick='saveEdit(" + a.id + ")'>Save</button>";
  html += "</p>";
  openPopup(html);

  fillOptions(el("eSex"), ["Male", "Female"], "", a.sex);
  fillOptions(el("eGradeLevel"), ["Grade 11", "Grade 12"], "", a.gradeLevel);
  fillOptions(el("eTrack"), getTracks(), "", a.track);
  fillOptions(el("eStrand"), settings.tracks[a.track], "", a.strand);
  fillOptions(el("eSemester"), ["First Semester", "Second Semester"], "", a.semester);
}

// Update the strand list when the track changes in the edit form
function editTrackChanged() {
  fillOptions(el("eStrand"), settings.tracks[el("eTrack").value]);
}

// Save the edited information
async function saveEdit(id) {
  const data = {
    fullName: el("eFullName").value,
    dateOfBirth: el("eDateOfBirth").value,
    sex: el("eSex").value,
    address: el("eAddress").value,
    contactNumber: el("eContactNumber").value,
    gradeLevel: el("eGradeLevel").value,
    track: el("eTrack").value,
    strand: el("eStrand").value,
    semester: el("eSemester").value
  };

  try {
    await api("/api/enrollments/" + id, "PUT", data);
    await loadData();
    viewApplication(id);
  } catch (error) {
    el("editMessage").innerHTML = error.message;
  }
}

// Show the students in one section
function viewSection(index) {
  const s = sections[index];
  let html = "<h2>" + s.name + "</h2>";
  html += "<p>" + s.students.length + " of " + s.capacity + " students - SY " + s.schoolYear + " - " + s.semester + "</p>";
  html += "<ol>";
  for (let i = 0; i < s.students.length; i++) {
    html += "<li>" + safe(s.students[i]) + "</li>";
  }
  html += "</ol>";
  html += "<p class='buttons'><button onclick='closePopup()'>Close</button></p>";
  openPopup(html);
}

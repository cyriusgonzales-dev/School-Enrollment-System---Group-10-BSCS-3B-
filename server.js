// Alvarez Academy Crest - Enrollment System (server.js)
const express = require("express");
const fs = require("fs");

const app = express();
const PORT = 3000;
const DATA_FILE = __dirname + "/data/enrollments.json";

// ----- Settings -----
const ACTIVE_SEMESTER = "First Semester"; // change to "Second Semester" when needed
const SECTION_CAPACITY = 35;
const ADMIN_USERNAME = "admin";    // DEMO ONLY - not secure
const ADMIN_PASSWORD = "admin123"; // DEMO ONLY - not secure

const TRACKS = {
  "Academic Track": ["STEM", "ABM", "HUMSS", "GAS"],
  "TVL Track": ["ICT", "Home Economics (HE)", "Industrial Arts (IA)", "Agri-Fishery Arts (AFA)"],
  "Sports Track": ["Sports Track"],
  "Arts and Design Track": ["Arts and Design Track"]
};

// Short names used for sections, example: "STEM 11 - A"
const SHORT_NAMES = {
  "STEM": "STEM",
  "ABM": "ABM",
  "HUMSS": "HUMSS",
  "GAS": "GAS",
  "ICT": "ICT",
  "Home Economics (HE)": "HE",
  "Industrial Arts (IA)": "IA",
  "Agri-Fishery Arts (AFA)": "AFA",
  "Sports Track": "SPORTS",
  "Arts and Design Track": "ARTS"
};

// ----- Subjects -----
// SAMPLE subjects based on the DepEd K to 12 SHS curriculum.
// This is not an official list. The school must verify it.
const CORE_SUBJECTS = {
  "Grade 11 First Semester": [
    "Oral Communication", "Komunikasyon at Pananaliksik", "General Mathematics",
    "Earth and Life Science", "Personal Development", "PE and Health 1"
  ],
  "Grade 11 Second Semester": [
    "Reading and Writing Skills", "Pagbasa at Pagsusuri", "Statistics and Probability",
    "Physical Science", "PE and Health 2"
  ],
  "Grade 12 First Semester": [
    "21st Century Literature", "Media and Information Literacy",
    "Understanding Culture, Society and Politics", "PE and Health 3"
  ],
  "Grade 12 Second Semester": [
    "Contemporary Philippine Arts", "PE and Health 4", "Inquiries, Investigations and Immersion"
  ]
};

// Strand subjects in this order: G11 1st Sem, G11 2nd Sem, G12 1st Sem, G12 2nd Sem
const STRAND_SUBJECTS = {
  "STEM": [
    ["Pre-Calculus"], ["Basic Calculus"],
    ["General Chemistry", "General Biology"], ["General Physics", "Capstone Project"]
  ],
  "ABM": [
    ["Business Mathematics"], ["Organization and Management"],
    ["Fundamentals of ABM", "Business Finance"], ["Applied Economics", "Business Enterprise Simulation"]
  ],
  "HUMSS": [
    ["Creative Writing"], ["Philippine Politics and Governance"],
    ["Creative Nonfiction", "Disciplines in the Social Sciences"], ["Community Engagement", "Culminating Activity"]
  ],
  "GAS": [
    ["Humanities 1"], ["Social Science 1"],
    ["Applied Economics", "Disaster Readiness and Risk Reduction"], ["Organization and Management", "Work Immersion"]
  ],
  "ICT": [
    ["Computer Systems Servicing 1"], ["Computer Systems Servicing 2"],
    ["Computer Programming 1"], ["Computer Programming 2", "Work Immersion"]
  ],
  "HE": [
    ["Cookery 1"], ["Cookery 2"],
    ["Bread and Pastry Production 1"], ["Bread and Pastry Production 2", "Work Immersion"]
  ],
  "IA": [
    ["Electrical Installation 1"], ["Electrical Installation 2"],
    ["Electrical Installation 3"], ["Electrical Installation 4", "Work Immersion"]
  ],
  "AFA": [
    ["Agricultural Crops Production 1"], ["Agricultural Crops Production 2"],
    ["Animal Production 1"], ["Animal Production 2", "Work Immersion"]
  ],
  "SPORTS": [
    ["Safety and First Aid"], ["Human Movement"],
    ["Fundamentals of Coaching", "Sports Officiating"], ["Fitness Programming", "Practicum"]
  ],
  "ARTS": [
    ["Creative Industries 1"], ["Creative Industries 2"],
    ["Developing Filipino Identity in the Arts"], ["Apprenticeship in the Arts", "Work Immersion"]
  ]
};

// Get the list of subjects for a student
function getSubjects(gradeLevel, strand, semester) {
  let subjects = [];

  // Core subjects
  const core = CORE_SUBJECTS[gradeLevel + " " + semester];
  for (let i = 0; i < core.length; i++) {
    subjects.push(core[i]);
  }

  // Strand subjects
  let position = 0;
  if (gradeLevel === "Grade 12") {
    position = position + 2;
  }
  if (semester === "Second Semester") {
    position = position + 1;
  }
  const strandList = STRAND_SUBJECTS[SHORT_NAMES[strand]][position];
  for (let i = 0; i < strandList.length; i++) {
    subjects.push(strandList[i]);
  }

  return subjects;
}

// ----- Helper functions -----

// Read all records from the JSON file
function readData() {
  const text = fs.readFileSync(DATA_FILE, "utf8");
  if (text.trim() === "") {
    return [];
  }
  return JSON.parse(text);
}

// Save all records to the JSON file
function saveData(records) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
}

// Example: 2026 becomes "2026-2027"
function getSchoolYear() {
  const year = new Date().getFullYear();
  return year + "-" + (year + 1);
}

// Find a record by its id. Returns the position, or -1 if not found.
function findRecord(records, id) {
  for (let i = 0; i < records.length; i++) {
    if (records[i].id == id) {
      return i;
    }
  }
  return -1;
}

// Make the next number, example: "AAC-SHS-2026-" becomes "AAC-SHS-2026-0001"
function makeNextNumber(records, field, start) {
  let highest = 0;
  for (let i = 0; i < records.length; i++) {
    const value = records[i][field];
    if (value !== "" && value.indexOf(start) === 0) {
      const number = parseInt(value.replace(start, ""));
      if (number > highest) {
        highest = number;
      }
    }
  }
  let next = String(highest + 1);
  while (next.length < 4) {
    next = "0" + next;
  }
  return start + next;
}

// Find the first section (A, B, C...) that has less than 35 approved students
function assignSection(student, records) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const grade = student.gradeLevel.replace("Grade ", "");

  for (let i = 0; i < letters.length; i++) {
    const sectionName = SHORT_NAMES[student.strand] + " " + grade + " - " + letters[i];

    // Count approved students already in this section
    let count = 0;
    for (let j = 0; j < records.length; j++) {
      const r = records[j];
      if (r.id !== student.id && r.status === "Approved" && r.section === sectionName &&
          r.schoolYear === student.schoolYear && r.semester === student.semester) {
        count++;
      }
    }

    if (count < SECTION_CAPACITY) {
      return sectionName;
    }
  }
  return "";
}

// Check the form data. Returns an error message, or "" if everything is correct.
function validate(data) {
  if (!data.fullName || data.fullName.trim().length < 3) {
    return "Full name is required.";
  }
  if (!data.dateOfBirth) {
    return "Date of birth is required.";
  }
  if (data.sex !== "Male" && data.sex !== "Female") {
    return "Please select a sex.";
  }
  if (!data.address || data.address.trim().length < 5) {
    return "Complete address is required.";
  }
  const phone = data.contactNumber || "";
  if (phone.length !== 11 || phone.indexOf("09") !== 0 || isNaN(phone)) {
    return "Contact number must be 11 digits starting with 09.";
  }
  if (data.gradeLevel !== "Grade 11" && data.gradeLevel !== "Grade 12") {
    return "Please select a grade level.";
  }
  if (!TRACKS[data.track] || TRACKS[data.track].indexOf(data.strand) === -1) {
    return "Please select a valid track and strand.";
  }
  return "";
}

app.use(express.json());
app.use(express.static(__dirname + "/public"));

// ----- API routes -----

// School settings for the web pages
app.get("/api/settings", function (req, res) {
  res.json({ schoolYear: getSchoolYear(), semester: ACTIVE_SEMESTER, tracks: TRACKS });
});

// Demo admin login
app.post("/api/login", function (req, res) {
  if (req.body.username === ADMIN_USERNAME && req.body.password === ADMIN_PASSWORD) {
    res.json({ message: "Login successful." });
  } else {
    res.status(401).json({ message: "Invalid username or password." });
  }
});

// Submit a new enrollment
app.post("/api/enrollments", function (req, res) {
  const error = validate(req.body);
  if (error !== "") {
    return res.status(400).json({ message: error });
  }

  const records = readData();
  const year = new Date().getFullYear();

  const newRecord = {
    id: records.length + 1,
    referenceNumber: makeNextNumber(records, "referenceNumber", "AAC-SHS-" + year + "-"),
    fullName: req.body.fullName.trim(),
    dateOfBirth: req.body.dateOfBirth,
    sex: req.body.sex,
    address: req.body.address.trim(),
    contactNumber: req.body.contactNumber,
    gradeLevel: req.body.gradeLevel,
    track: req.body.track,
    strand: req.body.strand,
    schoolYear: getSchoolYear(),
    semester: ACTIVE_SEMESTER,
    status: "Pending",
    dateSubmitted: new Date().toLocaleDateString(),
    studentId: "",
    section: "",
    subjects: []
  };

  records.push(newRecord);
  saveData(records);
  res.status(201).json(newRecord);
});

// Get all applications (newest first)
app.get("/api/enrollments", function (req, res) {
  const records = readData();
  records.reverse();
  res.json(records);
});

// Get one application
app.get("/api/enrollments/:id", function (req, res) {
  const records = readData();
  const index = findRecord(records, req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "Application not found." });
  }
  res.json(records[index]);
});

// Edit, approve, or deny an application
app.put("/api/enrollments/:id", function (req, res) {
  const records = readData();
  const index = findRecord(records, req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "Application not found." });
  }

  const record = records[index];
  const oldStatus = record.status;
  const oldGroup = record.gradeLevel + record.strand + record.semester;

  // Copy only the fields that were sent
  const fields = ["fullName", "dateOfBirth", "sex", "address", "contactNumber",
                  "gradeLevel", "track", "strand", "semester", "status"];
  for (let i = 0; i < fields.length; i++) {
    if (req.body[fields[i]] !== undefined) {
      record[fields[i]] = req.body[fields[i]];
    }
  }

  const error = validate(record);
  if (error !== "") {
    return res.status(400).json({ message: error });
  }

  if (record.status === "Approved") {
    // Give a Student ID (only once)
    if (record.studentId === "") {
      record.studentId = makeNextNumber(records, "studentId", "AAC-" + record.schoolYear.substring(0, 4) + "-");
    }
    // Give a section if newly approved or if grade/strand/semester changed
    const newGroup = record.gradeLevel + record.strand + record.semester;
    if (oldStatus !== "Approved" || oldGroup !== newGroup) {
      record.section = assignSection(record, records);
    }
    record.subjects = getSubjects(record.gradeLevel, record.strand, record.semester);
  } else {
    // Pending or Denied: no Student ID, section, or subjects
    record.studentId = "";
    record.section = "";
    record.subjects = [];
  }

  saveData(records);
  res.json(record);
});

// Check status using the reference number
app.get("/api/status/:reference", function (req, res) {
  const records = readData();
  const reference = req.params.reference.trim().toUpperCase();

  for (let i = 0; i < records.length; i++) {
    if (records[i].referenceNumber === reference) {
      const r = records[i];
      return res.json({
        fullName: r.fullName,
        referenceNumber: r.referenceNumber,
        gradeLevel: r.gradeLevel,
        track: r.track,
        strand: r.strand,
        schoolYear: r.schoolYear,
        status: r.status
      });
    }
  }
  res.status(404).json({ message: "Reference number not found." });
});

// Get approved students only
app.get("/api/students", function (req, res) {
  const records = readData();
  const students = [];
  for (let i = 0; i < records.length; i++) {
    if (records[i].status === "Approved") {
      students.push(records[i]);
    }
  }
  res.json(students);
});

// Get sections (made from approved students)
app.get("/api/sections", function (req, res) {
  const records = readData();
  const sections = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (r.status !== "Approved") {
      continue;
    }

    // Look for the section in the list
    let found = null;
    for (let j = 0; j < sections.length; j++) {
      const s = sections[j];
      if (s.name === r.section && s.schoolYear === r.schoolYear && s.semester === r.semester) {
        found = s;
      }
    }

    // If not in the list yet, add it
    if (found === null) {
      found = {
        name: r.section,
        gradeLevel: r.gradeLevel,
        track: r.track,
        strand: r.strand,
        schoolYear: r.schoolYear,
        semester: r.semester,
        capacity: SECTION_CAPACITY,
        students: []
      };
      sections.push(found);
    }

    found.students.push(r.fullName);
  }

  res.json(sections);
});

// Get subjects for a grade level, strand, and semester
app.get("/api/subjects", function (req, res) {
  if (!SHORT_NAMES[req.query.strand]) {
    return res.status(400).json({ message: "Invalid strand." });
  }
  res.json(getSubjects(req.query.gradeLevel, req.query.strand, req.query.semester));
});

app.listen(PORT, function () {
  console.log("Server running at http://localhost:" + PORT);
});

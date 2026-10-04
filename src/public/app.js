// Browser code. Text from the server is always written with textContent,
// never innerHTML, so a course title or error message cannot inject HTML.

const form = document.getElementById("lookup-form");
const studentInput = document.getElementById("student-id");
const message = document.getElementById("message");
const creditsEl = document.getElementById("credits");
const scheduleEl = document.getElementById("schedule");
const coursesEl = document.getElementById("courses");

let currentStudent = null;

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

function showMessage(text, kind) {
  message.textContent = text;
  message.className = kind;
}

function cell(row, text) {
  const td = document.createElement("td");
  td.textContent = text;
  row.appendChild(td);
  return td;
}

function renderSchedule(s) {
  creditsEl.textContent = `${s.name}: ${s.totalCredits} of ${s.maxCredits} credits`;
  scheduleEl.replaceChildren();
  for (const c of s.courses) {
    const li = document.createElement("li");
    li.textContent = `${c.code} — ${c.title} (${c.credits} cr) `;
    const btn = document.createElement("button");
    btn.textContent = "Drop";
    btn.setAttribute("aria-label", `Drop ${c.code}`);
    btn.addEventListener("click", () => act("DELETE", c.code, `Dropped ${c.code}.`));
    li.appendChild(btn);
    scheduleEl.appendChild(li);
  }
}

async function renderCourses() {
  const courses = await api("GET", "/api/courses");
  coursesEl.replaceChildren();
  for (const c of courses) {
    const tr = document.createElement("tr");
    cell(tr, c.code);
    cell(tr, c.title);
    cell(tr, String(c.credits));
    cell(tr, c.prerequisite || "—");
    cell(tr, String(c.seatsLeft));
    const btn = document.createElement("button");
    btn.textContent = "Register";
    btn.setAttribute("aria-label", `Register for ${c.code}`);
    btn.disabled = !currentStudent;
    btn.addEventListener("click", () => act("POST", c.code, `Registered for ${c.code}.`));
    cell(tr, "").appendChild(btn);
    coursesEl.appendChild(tr);
  }
}

async function act(method, courseCode, successText) {
  try {
    const s = await api(method, "/api/registrations", { studentId: currentStudent, courseCode });
    renderSchedule(s);
    showMessage(successText, "ok");
  } catch (err) {
    showMessage(err.message, "error");
  }
  await renderCourses();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const s = await api("GET", `/api/students/${encodeURIComponent(studentInput.value.trim())}/schedule`);
    currentStudent = s.studentId;
    renderSchedule(s);
    showMessage("", "");
  } catch (err) {
    currentStudent = null;
    showMessage(err.message, "error");
  }
  await renderCourses();
});

renderCourses();

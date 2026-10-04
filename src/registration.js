// Business rules for course registration. Kept separate from the HTTP server
// so the rules can be read (and reviewed) on their own.

const MAX_CREDITS = 18;
const STUDENT_ID_PATTERN = /^S\d{6}$/;
const COURSE_CODE_PATTERN = /^[A-Z]{2,4}\d{3}$/;

function seedData() {
  return {
    courses: {
      CS101: { code: "CS101", title: "Intro to Programming", credits: 3, capacity: 30, enrolled: 10, prerequisite: null },
      CS201: { code: "CS201", title: "Data Structures", credits: 3, capacity: 30, enrolled: 12, prerequisite: "CS101" },
      CS301: { code: "CS301", title: "Algorithms", credits: 3, capacity: 30, enrolled: 8, prerequisite: "CS201" },
      SE411: { code: "SE411", title: "Software Validation & Testing", credits: 4, capacity: 30, enrolled: 20, prerequisite: "CS201" },
      MATH101: { code: "MATH101", title: "Calculus I", credits: 3, capacity: 40, enrolled: 1, prerequisite: null },
      PHY101: { code: "PHY101", title: "Physics I", credits: 4, capacity: 40, enrolled: 1, prerequisite: null },
      ENG101: { code: "ENG101", title: "Academic English", credits: 3, capacity: 40, enrolled: 1, prerequisite: null },
      HIST101: { code: "HIST101", title: "World History", credits: 3, capacity: 40, enrolled: 1, prerequisite: null },
      BIO101: { code: "BIO101", title: "Biology Basics", credits: 2, capacity: 40, enrolled: 1, prerequisite: null },
      LAB200: { code: "LAB200", title: "Robotics Lab", credits: 1, capacity: 1, enrolled: 1, prerequisite: null },
    },
    students: {
      // A new student: nothing completed, nothing registered.
      S100001: { id: "S100001", name: "Aisha Karim", completed: [], registered: [] },
      // Has 15 credits registered, so +3 reaches the 18 limit and +4 passes it.
      S100002: {
        id: "S100002",
        name: "Omar Haddad",
        completed: ["CS101", "CS201"],
        registered: ["MATH101", "PHY101", "ENG101", "HIST101", "BIO101"],
      },
      // Has completed CS101 only.
      S100003: { id: "S100003", name: "Lina Yousef", completed: ["CS101"], registered: [] },
    },
  };
}

let db = seedData();

function reset() {
  db = seedData();
}

class RegistrationError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function listCourses() {
  return Object.values(db.courses).map((c) => ({ ...c, seatsLeft: c.capacity - c.enrolled }));
}

function creditsOf(student) {
  return student.registered.reduce((sum, code) => sum + db.courses[code].credits, 0);
}

function findStudent(studentId) {
  if (typeof studentId !== "string" || !STUDENT_ID_PATTERN.test(studentId)) {
    throw new RegistrationError(400, "INVALID_STUDENT_ID", "Student ID must be the letter S followed by 6 digits.");
  }
  const student = db.students[studentId];
  if (!student) throw new RegistrationError(404, "STUDENT_NOT_FOUND", "No student with that ID.");
  return student;
}

function findCourse(courseCode) {
  if (typeof courseCode !== "string" || !COURSE_CODE_PATTERN.test(courseCode)) {
    throw new RegistrationError(400, "INVALID_COURSE_CODE", "Course code must look like CS101.");
  }
  const course = db.courses[courseCode];
  if (!course) throw new RegistrationError(404, "COURSE_NOT_FOUND", "No course with that code.");
  return course;
}

function schedule(studentId) {
  const student = findStudent(studentId);
  return {
    studentId: student.id,
    name: student.name,
    courses: student.registered.map((code) => db.courses[code]),
    totalCredits: creditsOf(student),
    maxCredits: MAX_CREDITS,
  };
}

// The order of these checks is part of the specification (see the decision
// table in docs/REPORT.md): the first rule that fails decides the answer.
function register(studentId, courseCode) {
  const student = findStudent(studentId);
  const course = findCourse(courseCode);

  if (student.registered.includes(course.code)) {
    throw new RegistrationError(409, "ALREADY_REGISTERED", `Already registered for ${course.code}.`);
  }
  if (student.completed.includes(course.code)) {
    throw new RegistrationError(409, "ALREADY_COMPLETED", `${course.code} is already completed.`);
  }
  if (course.prerequisite && !student.completed.includes(course.prerequisite)) {
    throw new RegistrationError(422, "PREREQUISITE_MISSING", `${course.code} requires ${course.prerequisite}.`);
  }
  if (course.enrolled >= course.capacity) {
    throw new RegistrationError(409, "COURSE_FULL", `${course.code} has no seats left.`);
  }
  if (creditsOf(student) + course.credits > MAX_CREDITS) {
    throw new RegistrationError(422, "CREDIT_LIMIT", `This would exceed the ${MAX_CREDITS}-credit limit.`);
  }

  student.registered.push(course.code);
  course.enrolled += 1;
  return schedule(studentId);
}

function drop(studentId, courseCode) {
  const student = findStudent(studentId);
  const course = findCourse(courseCode);
  if (!student.registered.includes(course.code)) {
    throw new RegistrationError(404, "NOT_REGISTERED", `Not registered for ${course.code}.`);
  }
  student.registered = student.registered.filter((code) => code !== course.code);
  course.enrolled -= 1;
  return schedule(studentId);
}

module.exports = { MAX_CREDITS, RegistrationError, listCourses, schedule, register, drop, reset };

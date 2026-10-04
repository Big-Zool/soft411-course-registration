# Modern Testing Strategy & Prototype — Course Registration

SOFT411 Software Validation & Testing · Lecture 1 assignment

## 1. System under test

A small **course registration** web system: a student enters their ID, sees their schedule,
and registers for or drops courses. It has a JSON API and a one-page web UI.

| Rule | Detail |
|---|---|
| R1 Student ID | The letter `S` followed by exactly 6 digits, and must exist |
| R2 Course code | 2–4 capital letters + 3 digits (e.g. `CS101`), and must exist |
| R3 No duplicates | Cannot register for a course twice, or for one already completed |
| R4 Prerequisite | Must have completed the course's prerequisite |
| R5 Capacity | Cannot register when no seats are left |
| R6 Credit limit | Total registered credits may not exceed **18** |
| R7 Drop | Dropping frees the seat; cannot drop a course you are not registered for |

## 2. Risk analysis

Risk = likelihood × impact, each scored 1 (low) – 3 (high).

| # | Risk | Likelihood | Impact | Score | Response |
|---|---|---|---|---|---|
| K1 | Student exceeds the credit limit (off-by-one at 18) | 3 | 3 | **9** | Boundary value tests at 18 / 19 |
| K2 | Student registers without the prerequisite | 2 | 3 | **6** | Decision-table tests |
| K3 | Course is over-filled, or a seat is not freed on drop | 2 | 3 | **6** | Decision-table + state-transition tests |
| K4 | Invalid input is accepted | 2 | 2 | **4** | Equivalence-partition tests on the student ID |
| K5 | Students who use a keyboard or screen reader cannot register | 2 | 2 | **4** | Automated accessibility scan |

## 3. Quality criteria

**Functional**

- F1 Every rule R1–R7 behaves as specified, including both sides of every boundary.
- F2 A refused registration changes nothing (no partial update of credits or seats).
- F3 The user sees the server's actual reason for a refusal, not a generic error.

**Non-functional**

- N1 Accessibility: **zero** automatically detectable WCAG 2.2 A/AA violations (axe-core).

## 4. Test cases

Techniques: equivalence partitioning (EP), boundary value analysis (BVA),
decision tables (DT), state-transition testing (ST).

| ID | Technique | Level | Input / steps | Expected | Automated |
|---|---|---|---|---|---|
| TC-01 | EP (valid class) | API | `S100001` registers `MATH101` | 201, schedule has MATH101, 3 credits | Manual |
| TC-02 | EP (invalid classes) | API | IDs `S12345`, `S1234567`, `100001`, `s100001`, empty | 400 `INVALID_STUDENT_ID` | ✅ |
| TC-03 | EP (valid format, unknown) | API | `S999999` | 404 `STUDENT_NOT_FOUND` | Manual |
| TC-04 | BVA (on the limit) | API | `S100002` (15 cr) + `CS301` (3 cr) = 18 | 201, total 18 | Manual |
| TC-05 | BVA (just over) | API | `S100002` (15 cr) + `SE411` (4 cr) = 19 | 422 `CREDIT_LIMIT`, still 15 credits | ✅ |
| TC-06 | DT (prerequisite = no) | API | `S100001` registers `CS201` | 422 `PREREQUISITE_MISSING` | ✅ |
| TC-07 | DT (seats = 0) | API | `S100001` registers `LAB200` | 409 `COURSE_FULL` | Manual |
| TC-08 | DT (already registered) | API | register `MATH101` twice | 2nd is 409 `ALREADY_REGISTERED` | Manual |
| TC-09 | DT (already completed) | API | `S100003` registers `CS101` | 409 `ALREADY_COMPLETED` | Manual |
| TC-10 | ST | API | register → drop → drop again | seat −1 then restored; 2nd drop 404 | ✅ |
| TC-11 | Use-case journey | UI | load S100001, register CS101, drop it | message, schedule and credits update | Manual |
| TC-12 | Accessibility check | UI | axe scan with WCAG 2.2 A/AA tags | 0 violations | ✅ |

### Decision table for `register` (rules checked in this order; the first failure wins)

| Condition | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Already registered | Y | N | N | N | N | N |
| Already completed | – | Y | N | N | N | N |
| Prerequisite met | – | – | N | Y | Y | Y |
| Seats left | – | – | – | N | Y | Y |
| Credits + new ≤ 18 | – | – | – | – | N | Y |
| **Result** | 409 duplicate | 409 completed | 422 prereq | 409 full | 422 limit | **201 registered** |
| Test | TC-08 | TC-09 | TC-06 | TC-07 | TC-05 | TC-01, TC-04 |

### State-transition model (one student, one course)

```
          register (all rules pass)              drop
 [Not registered] ─────────────────────▶ [Registered] ─────▶ [Not registered]
        │                                                        │
        └── drop ──▶ 404 NOT_REGISTERED (invalid transition) ◀───┘
```

## 5. Automation and CI

| Need | Tool |
|---|---|
| 4 automated checks (TC-02, TC-05, TC-06, TC-10) | **Playwright** (`@playwright/test`) |
| Accessibility check (TC-12) | **axe-core** (`@axe-core/playwright`), run inside Playwright |
| CI/CD workflow | **GitHub Actions** (`.github/workflows/tests.yml`), runs the tests on every push and pull request |

## 6. Results

- **Automated checks:** 4 / 4 passed.
- **Accessibility check:** 0 axe violations.
- **CI (GitHub Actions):** the workflow runs on every push and passed.

## 7. Reflection — what did automation miss, and where was human judgment still necessary?

When I started this assignment I thought the hard part would be writing the automated tests.
In the end, writing them was the easy part. The hard part was every decision around them,
and most of those decisions were mine, not the tool's.

The first thing I noticed is that a test can only check what I already decided. My suite
checks that a student cannot go above 18 credits. But no test asked whether 18 is the
correct number, or whether there should be an add/drop deadline, or a lower limit for
students on probation. These rules were simply never written down, so nothing could fail
on them. This is principle 7 from the lecture: a system can pass every test and still not
be what the users need.

The second thing was the failures that were not bugs in my app at all. When I ran the tests
on my own computer, the browser test failed. It was not the UI. Playwright could not find its
browser, because it had been installed in a different environment from the one I was using.
The API checks passed because they do not need a browser. The test report only said
"failed"; I had to read the error and understand the setup to know that the product was
fine. Something similar happened on GitHub Actions: the first run did not fail, it just
waited for 10 minutes and was cancelled. A step that waited for the app was sending HEAD
requests, which my server does not answer, so it waited forever. Automation told me
something was wrong, but a person had to find out what, and decide whether it was the
product, the test or the pipeline.

The third thing was choosing what to test. Exhaustive testing is impossible, so I had to
pick. I used boundary values around 18 credits, equivalence classes for the student ID, and
a decision table for the registration rules. I also had to decide the order of the rules: if
a student is missing the prerequisite and is also over the credit limit, which message should
they see? The tool runs the table, but it did not design it.

The fourth thing was accessibility. The axe scan found 0 violations, which sounds perfect.
But axe only finds problems a machine can measure, like missing labels or low colour
contrast. It cannot tell me if the page makes sense when a screen reader reads it, or if
pressing Tab through ten "Register" buttons is tiring. A green result here means "no
automatic failures found", not "accessible", and only a real person using the page can
answer the second question.

My tests also run one at a time on purpose, because they share data. That makes them
reliable, but it also means they can never show what happens when two students take the
last seat at the same moment. I only found this risk by thinking about how the system
would work with a real database, not from any test result.

So automation gave me fast and repeatable evidence for the risks I had already chosen.
But I still had to find the risks, choose the test data, decide what "correct" means,
investigate failures that were not real bugs, and explain what the green results do not
prove. This matches the main idea of the lecture: testing gives evidence about risk, not
proof that the software is perfect.

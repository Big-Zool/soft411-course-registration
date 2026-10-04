# Review Questions (slide 31) — Answers

**1. Why can successful tests never prove that software is defect-free?**
Tests only check the inputs and situations they actually run. Exhaustive testing is
impossible: the combinations of inputs, devices, data and timing are practically
endless. So a pass is evidence about the cases tried, not about the ones left out.
This is principle 1, "testing shows the presence, not the absence, of defects". Reports
should state the residual risk and what was not covered.

**2. How does "shift left" change tester involvement in the SDLC?**
Testers join at the start instead of the end. They review requirements for ambiguity and
gaps, help write acceptance criteria, and design tests alongside the code (TDD/ATDD).
Static analysis and security checks also run early. Defects are found when they are
cheapest to fix, and feedback starts before the software even runs.

**3. When would you prefer API-level tests over end-to-end UI tests?**
When checking business rules and data: validation, calculations, error codes,
permissions, and many input combinations. API tests are faster, more stable (no
rendering or timing issues) and pinpoint the failing layer. Keep a small number of
UI tests for the journeys a real user must be able to complete. This follows the test
pyramid on slide 16.

**4. What makes a test a good candidate for automation?**
It is repetitive, deterministic (same input, same expected result) and high-value, and
it must run often or across many environments. Regression checks and core business rules
are good examples. It should also have a stable feature behind it, so the upkeep cost
stays low. Poor candidates are subjective judgments, fast-changing prototypes, unstable
flows, and one-off checks that are cheaper to do by hand.

**5. Why is observability important when testing distributed systems?**
A failure in a distributed system can start in one service and show up in another, or
come from timeouts, retries or partial outages that pre-release tests cannot fully
reproduce. Logs, metrics and traces show where a request went and where it failed. They
make failures diagnosable and let us keep checking quality in production.

**6. What extra risks appear when the system includes a Large Language Model (LLM)?**

- Outputs vary for the same input (non-deterministic), so plain pass/fail assertions do not work.
- Hallucination: confident but false answers.
- Prompt injection: input that overrides the system's instructions.
- Leaking private or training data.
- Unsafe or harmful content, and bias or unfairness.
- Latency and cost.
- Silent quality changes when the model or prompt is updated.

Testing needs golden datasets, adversarial prompts and human rating. It also needs
measurable "good enough" criteria, version-to-version regression checks, monitoring,
and a clear hand-off to a human.

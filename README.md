# Course Registration — Testing Strategy & Prototype

SOFT411 Software Validation & Testing, Lecture 1 assignment.
Report: [`docs/REPORT.md`](docs/REPORT.md)

## Run it

```bash
npm install
node node_modules/@playwright/test/cli.js install chromium
npm start          # app on http://localhost:3000
npm test           # 4 automated checks + the accessibility check
npm run report     # open the HTML test report
```

CI: `.github/workflows/tests.yml` runs the tests on every push and pull request.

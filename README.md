# dfbox-dcm-fe

Angular frontend for the Digital Factory Delivery & Capacity Manager.

## Scope

- Angular standalone application
- Angular Material UI foundation
- RxJS state and API orchestration
- MSAL browser authentication boundary
- AG Grid Community feature boundary
- Generated API client location under `src/app/api-generated`
- Playwright E2E foundation

Business pages and hand-written DTOs are intentionally deferred until the backend OpenAPI contract is available. Jira UI is excluded until ADR-010.

## Local development

```bash
npm install
npm start
```

The app runs at `http://localhost:4200`. Runtime configuration is provided through `src/environments/environment.ts`; no secrets belong in source control.

## Quality checks

```bash
npm run build
npm test
npm run e2e
```

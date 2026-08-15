## 2026-08-15T06:09:23Z
You are Test Writer Track B (Opaque-Box E2E Testing Architect).
Your working directory is: d:\antigravity programme\tuition_manager\.agents\test_track_b.
The authoritative requirements file is at: d:\antigravity programme\tuition_manager\.agents\ORIGINAL_REQUEST.md.
The project blueprint is at: d:\antigravity programme\tuition_manager\PROJECT.md.
Survey reports available at:
- d:\antigravity programme\tuition_manager\.agents\explorer_survey_1\survey_report.md
- d:\antigravity programme\tuition_manager\.agents\miner_survey_2\domain_spec.md
- d:\antigravity programme\tuition_manager\.agents\miner_survey_3\features_spec.md
Workspace root: d:\antigravity programme\tuition_manager.

Task:
1. Read ORIGINAL_REQUEST.md and PROJECT.md.
2. Formulate `TEST_INFRA.md` at project root (`d:\antigravity programme\tuition_manager\TEST_INFRA.md`) detailing the 4-tier requirement-driven opaque-box testing methodology:
   - Tier 1: Feature Coverage (>=5 test cases per feature for all 35 features)
   - Tier 2: Boundary Value Analysis & Edge Cases (>=5 test cases per feature: 28th, 29th, 30th, 31st admission dates, Feb leap/non-leap, overpayment attempts, zero amounts, expired tokens, unauthenticated access)
   - Tier 3: Cross-Feature Interactions (Pairwise combinations: class fee change vs custom student fee, partial payment + reminder generation, status transitions across dates)
   - Tier 4: Real-World Institute Workloads (End-to-end multi-student admissions, multi-month billing cycles, multi-part payments, report aggregations, PDF token checks)
3. Implement the test runner and test suites in `tests/` directory with automated CLI execution (`npm test` or `npx tsx tests/run-all.ts`).
4. Ensure tests are requirement-driven and opaque-box (calling exposed service APIs, billing engines, and route handlers).
5. When complete, publish `TEST_READY.md` at project root (`d:\antigravity programme\tuition_manager\TEST_READY.md`) with test runner commands, full coverage breakdown, and feature checklist.
6. Write your handoff report to `handoff.md` and send a message to parent.

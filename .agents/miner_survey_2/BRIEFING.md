# BRIEFING — 2026-08-15T05:57:40Z

## Mission
Mine, analyze, and document the complete Fee Engine & Business Domain specifications from ORIGINAL_REQUEST.md and domain requirements.

## 🔒 My Identity
- Archetype: Specification Miner
- Roles: Fee Engine & Business Domain Spec Miner
- Working directory: d:\antigravity programme\tuition_manager\.agents\miner_survey_2
- Original parent: bb850ac0-f715-4bae-879d-1a982dc61d92
- Milestone: Specification Mining / Domain Discovery

## 🔒 Key Constraints
- Read-only on codebase / requirements; do NOT implement anything.
- Probe all explicit and implicit domain specifications for Fee Engine, Billing Cycles, Date Math, Fee Modes, Immutability, Late Fees, Discounts, Student Codes, Student/Class Models & Enums.
- Write domain_spec.md and handoff.md in own directory.

## Current Parent
- Conversation ID: bb850ac0-f715-4bae-879d-1a982dc61d92
- Updated: 2026-08-15T05:57:40Z

## Task Summary
- **What to build**: Comprehensive domain specification document (domain_spec.md) covering Fee Engine, Date Math, Billing Cycles, Models, Enums, State Machines, Immutability, Idempotency.
- **Success criteria**: Exhaustive tables of features and edge cases, rigorous date-fns algorithms, state machine definitions, exact DB constraints, model schemas.
- **Interface contracts**: ORIGINAL_REQUEST.md
- **Code layout**: .agents/miner_survey_2/domain_spec.md, .agents/miner_survey_2/handoff.md

## Key Decisions Made
- Anchored date calculation around `admission_date` anchor day with `min(anchorDay, daysInMonth)` clamping and immediate month recovery.
- Snapshot columns (`base_amount`, `admission_fee_amount`, `discount_amount`, `late_fee_amount`, `fee_mode`, `class_id`) stored directly on `fee_records` for full historical immutability.
- Idempotency enforced via compound unique constraint `@@unique([student_id, billing_period_start, billing_period_end])`.
- Auto-generated sequences: `DPR-{YEAR}-{SEQ}` and `DPR-RC-{YEAR}-{SEQ}` using atomic year-scoped transactions.

## Artifact Index
- .agents/miner_survey_2/DISPATCH.md — Initial dispatch instructions
- .agents/miner_survey_2/BRIEFING.md — Persistent context & identity
- .agents/miner_survey_2/progress.md — Liveness & progress tracking
- .agents/miner_survey_2/domain_spec.md — Complete Fee Engine & Domain specification
- .agents/miner_survey_2/handoff.md — 5-component handoff report

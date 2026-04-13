# Frontend Card Refactor Plan

## Objective

Refactor the operator dashboard so each visible section maps directly to its own card component.

The current UI is working, but some parts are still composite components that contain multiple page sections. Splitting those into standalone cards will make layout changes safer, reduce style drift, and make the page structure easier to understand in code.

## Why This Refactor

Current problems:

- some components still own multiple visual sections
- collapse behavior is repeated across different areas
- card headers and card body spacing are not yet standardized
- styling changes are harder than they should be because section boundaries in code do not fully match the rendered page

Target outcome:

- one card component per visible dashboard section
- shared card shell and header patterns
- cleaner styling rules
- easier future redesigns and layout tuning

## Proposed Component Structure

### Shared primitives

- `CardShell`
- `CardHeader`
- `CardBody`
- `CardCollapseButton`

These should standardize:

- border radius
- padding
- header spacing
- title and kicker layout
- action alignment
- collapsed-state treatment

### Left rail cards

- `SessionSetupCard`
- `OperateCard`

`SessionSetupCard` should own:

- session name
- initial balance
- treasury interest per round
- agent roster
- create session
- connect to session id

`OperateCard` should own:

- turn count
- turn presets
- run turns
- advance round
- latest activity

### Main workspace cards

- `SessionOverviewCard`
- `BalancesCard`
- `TreasuryCard`
- `AuditTrailCard`

`SessionOverviewCard` should own:

- session name
- status
- current round
- session id

`BalancesCard` should own:

- agent balance grid
- its own collapse control

`TreasuryCard` should own:

- custody overview
- custody summary metrics
- trader custody details
- its own collapse control

`AuditTrailCard` should own:

- replay filters
- event-window selector
- round-window selector
- scrollable replay list
- its own collapse control

## Refactor Rules

- each card should render one clear section of the page
- card-level collapse behavior should be handled consistently
- card header markup should follow one shared pattern
- empty states should be owned by the card that needs them
- section-specific styles should be minimized in favor of shared card primitives

## Out Of Scope

This pass should not:

- change backend behavior
- reintroduce manual custody controls on the frontend
- redesign the app’s information architecture again

## Implementation Order

1. Introduce shared card primitives without changing behavior.
2. Extract `SessionSetupCard` from the current setup portion.
3. Extract `OperateCard` from the current operate portion.
4. Split the workspace into `SessionOverviewCard`, `BalancesCard`, and `TreasuryCard`.
5. Extract `AuditTrailCard` from the replay component.
6. Reduce page-level CSS by moving repeated patterns into shared card styles.

## Success Criteria

The refactor is successful when:

- every visible dashboard section has a matching card component
- repeated card layout code is reduced
- collapse controls are standardized
- styling changes can be made card-by-card without unexpected layout regressions

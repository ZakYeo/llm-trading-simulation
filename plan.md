# Frontend UI Refresh Plan

## Objective

Keep simplifying the operator console so the main workflow stays visible while long-running session data remains manageable.

This plan covers the next UI pass only.

## Completed

These changes are already done:

- persistent top bar with session, round, status, latest activity, and help entry point
- split left rail with separate setup and operate cards
- treasury overview integrated into the main workspace
- manual custody actions removed from the frontend
- replay moved into the main workspace column below treasury
- replay filtering by event type
- fixed-height replay panel with internal scrolling
- replay window selector for recent event counts
- help modal for onboarding and feature explanation

## Current Slice

Implement the following changes in this pass:

1. Extend audit trail windowing beyond event count.
   - Keep the existing recent-event selector.
   - Add a round-based selector so the operator can view only the last few rounds.

2. Remove low-value summary copy from the main workspace.
   - Remove the `Readiness` box under `Session Workspace`.
   - Remove the `Recommended loop` block under `Run The Session`.

3. Replace text collapse controls with icon-style controls.
   - Update the `Session Setup` collapse toggle to use an icon-only button.
   - Add matching collapse controls to the main `Live State` section.
   - Add matching collapse controls to the `Balances` section.

4. Add treasury interest control to session setup.
   - Add a frontend input for round interest override under `Session Setup`.
   - Wire it into the round-advance action so the operator can control the interest applied per round from the UI.

5. Improve roster editing ergonomics.
   - Make bot name fields wider so names are readable while editing.

## Out Of Scope

Do not add back manual custody placement or redemption controls in this pass.

## Remaining Later Polish

After this slice, remaining polish work is:

- improve inline success and error feedback near the triggered action
- refine empty states for no session, no treasury exposure, and no replay results
- consider a more guided session picker than raw pasted session id
- tune spacing and responsive behavior after a browser pass

## Success Criteria

This pass is successful when:

- replay can be scoped by recent events and recent rounds
- collapsible sections use lighter-weight icon controls
- the workspace loses low-signal explanatory boxes
- interest per round can be controlled from the setup rail
- roster editing is less cramped

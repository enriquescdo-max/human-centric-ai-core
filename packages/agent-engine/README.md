# @hcai/agent-engine

The left brain. `TaskRouter` sends tasks to narrow workers that can only *propose* actions — never execute. Execution happens in the host app, only after the HITL checkpoint clears.

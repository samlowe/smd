---
allowed-tools: Read, Write, Edit, Bash(git status:*), Bash(git diff:*), Bash(git show:*), Bash(grep:*), Bash(sed:*)
description: Following implementation of a change, check if it has any issues, and consider refactorings
argument-hint: [any-concerns-or-questions]
---

Following implementation of a change, check if it has any issues, and consider refactorings: `$ARGUMENTS`

## Instructions

Following the implementation of a feature or change just completed, using the knowledge gained from its implementation and the purview that looking over the code allows, consider:

1. Does the code implemented have any bugs or gaps that should be addressed?
2. Does the design now appear to have inadequancies that should be reconsidered?
3. Is there any refactoring that we should consider that we can now see or suspect would make the solution better (cleaner, more DRY, better wrt SRP etc)?

Sometimes the best times to design a code change is just after you've completed to first go at it and you have the experience and knowledge of the implications of the change, and othe ropportunities for improvement sometimes become apparent during the change. Share those

And no initial design is perfect, better to check for any bugs or gaps now than to hope the design did not get anything wrong.

Give a list of anything found for each of #1, #2, and #3 described above.

Also consider whether we have sufficient tests to cover the new additions/changes and anything affected by them.

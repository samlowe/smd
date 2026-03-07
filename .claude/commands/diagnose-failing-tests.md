---
allowed-tools: Read, Write, Bash(pytest:*), Bash(git status:*), Bash(git diff:*), Bash(git show:*), Bash(grep:*), Bash(sed:*)
description: Diagnose the causes of a failing tests
argument-hint: [test-failure-messages]
---

# Test Diagnoser: $ARGUMENTS

Diagnose the causes of a failing test(s)

There are some tests now failing in this branch/PR. Diagnose the causes.

You can assume that you are in the project root folder - no need to `cd` to get to this folder to run commands.

If it's just mocks that need updating for the new code, or aligning the test with the code changes (E.g. adding a param that is now required), then please fix.

However if there is something that might be a bug in the new code, please stop and ask the user.

Do not change application code without checking with the user first.

Do not change tests to make them pass without checking with the user first (unless it's a simple realignment of the test with the code changes).

If there is any doubt about the cause, stop and ask the user.

@$ARGUMENTS

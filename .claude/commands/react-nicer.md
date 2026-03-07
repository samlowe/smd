---
allowed-tools: Read, Write, Bash(pytest:*), Bash(git status:*), Bash(git diff:*), Bash(git show:*), Bash(grep:*), Bash(sed:*)
description: Refactor a React component to make it easier to understand and maintain
argument-hint: [component-path]
---

# React : $ARGUMENTS

in the file, please refactor the React code to make it easier to understand and maintain.

For example:

- Make the code more readable/testable/maintainable E.g. DRY, SOLID, etc.
- Break out complex logic into subfunctions or components
- Avoid ternaries in the JSX, use subfunctions/components with early returns instead
- Use meaningfully named subfunctions, components and variables
- Remove redundant comments and prefer meaningful var and function names instead if possible, or similar so that the code is self-documenting

@$ARGUMENTS

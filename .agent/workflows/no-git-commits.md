---
description: Strict rule to never use git commit or push commands
---

# 🚫 NEVER COMMIT CODE

**CRITICAL RULE FOR ALL AI AGENTS:**

The user handles ALL version control manually. You are **strictly forbidden** from executing any of the following commands or anything similar:

- `git commit`
- `git push`
- `git add` (unless explicitly and specifically requested to stage a file, but generally avoid)

**Your Responsibilities:**
1. Write the code.
2. Edit the files.
3. Run the tests.
4. Notify the user of the results.
5. **STOP.** Do not commit. Do not push.

The user is NOT using AI to commit the code. Let the user review and commit the changes in their IDE.

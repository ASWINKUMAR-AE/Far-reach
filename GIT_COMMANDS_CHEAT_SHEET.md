# 🛠️ Git & Team Workflow Command Cheat Sheet

Comprehensive guide for **Aswin** (`aswin` branch) and **Prakash** (`prakash` branch) to collaborate and combine work into `main`.

---

## 📌 Quick Summary of Branches

- **`main`**: Production / combined stable codebase.
- **`aswin`**: Aswin's development branch.
- **`prakash`**: Prakash's development branch.

---

## 🚀 1. Daily Development Workflow

### For Aswin:
```bash
# 1. Switch to your branch
git checkout aswin

# 2. Get the latest changes from GitHub
git pull origin aswin

# 3. Check what files you modified
git status

# 4. Stage and commit your changes
git add .
git commit -m "feat: describe what you worked on"

# 5. Push changes to GitHub
git push origin aswin
```

### For Prakash (On His Machine):
```bash
# 1. Switch to your branch
git checkout prakash

# 2. Get the latest changes from GitHub
git pull origin prakash

# 3. Check modified files
git status

# 4. Stage and commit your changes
git add .
git commit -m "feat: describe what you worked on"

# 5. Push changes to GitHub
git push origin prakash
```

---

## 🔀 2. How to Combine Both Branches into `main`

Run this sequence on your machine when both you and Prakash have pushed your work and want to combine everything into `main`:

```bash
# Step 1: Save and push your current work first
git checkout aswin
git add .
git commit -m "Save latest work before merge"
git push origin aswin

# Step 2: Switch to main and get the latest main branch
git checkout main
git pull origin main

# Step 3: Fetch all latest branches from GitHub
git fetch origin

# Step 4: Merge your branch (aswin) into main
git merge origin/aswin -m "Merge aswin work into main"

# Step 5: Merge Prakash's branch (prakash) into main
git merge origin/prakash -m "Merge prakash work into main"

# Step 6: Push the combined main branch to GitHub
git push origin main
```

---

## 🔄 3. Update Your Branches with Combined `main`

After `main` has been updated with everyone's code, both members should update their personal branches so everyone has the full latest code:

### For Aswin:
```bash
git checkout aswin
git merge main
git push origin aswin
```

### For Prakash:
```bash
git checkout prakash
git pull origin main
git push origin prakash
```

---

## ⚡ 4. How to Resolve Merge Conflicts (If Any)

If you and Prakash modified the same lines in the same file, Git will pause the merge and show:
```
CONFLICT (content): Merge conflict in <file-name>
Automatic merge failed; fix conflicts and then commit the result.
```

### Steps to Fix:
1. Open the highlighted file in VS Code.
2. You will see conflict markers:
   ```text
   <<<<<<< HEAD
   Your current code on main
   =======
   Prakash's code incoming from prakash
   >>>>>>> origin/prakash
   ```
3. Click **"Accept Incoming Change"**, **"Accept Current Change"**, or manually edit the code to keep both parts.
4. Save the file.
5. Finalize the merge:
   ```bash
   git add .
   git commit -m "fix: resolve merge conflicts between aswin and prakash"
   git push origin main
   ```

---

## 🧰 5. Useful Emergency & Helper Commands

| What you want to do | Command |
| :--- | :--- |
| Check current branch & file status | `git status` |
| View all local & remote branches | `git branch -a` |
| View recent commit history | `git log --oneline -n 10` |
| Discard uncommitted changes in a file | `git restore <file>` |
| Discard all uncommitted changes | `git restore .` |
| Temporarily stash uncommitted changes | `git stash` |
| Restore stashed changes | `git stash pop` |
| Undo the last commit (keep files changed) | `git reset --soft HEAD~1` |
| Cancel an in-progress merge | `git merge --abort` |

---

## 🌐 6. Alternative: GitHub Pull Request (One-Click Merge)

Instead of merging in the terminal, you can merge online with code reviews:
1. Open: **[https://github.com/ASWINKUMAR-AE/Far-reach/pulls](https://github.com/ASWINKUMAR-AE/Far-reach/pulls)**
2. Click **"New pull request"**.
3. Set **Base**: `main` ⟵ **Compare**: `aswin` (or `prakash`).
4. Click **"Create pull request"** ➔ **"Merge pull request"**.

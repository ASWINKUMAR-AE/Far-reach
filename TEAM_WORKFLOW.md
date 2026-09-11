# 🤝 Far-Reach Team Collaboration Guide

Welcome to the **Far-Reach** project team workspace!

---

## 👥 Team Members & Dedicated Branches

| Member | GitHub Username | Email | Assigned Branch |
| :--- | :--- | :--- | :--- |
| **Aswin Kumar** | `ASWINKUMAR-AE` | `aswinkumarta2006@gmail.com` | `aswin` |
| **Prakash** | `prakash2006-xl` | `rskakavin@gmail.com` | `prakash` |
| **Production / Stable** | — | — | `main` |

---

## 🔑 Step 1: Invite Prakash as Collaborator (For Aswin)

To grant Prakash permission to push directly and collaborate:

1. Open your GitHub repository settings:
   👉 **[https://github.com/ASWINKUMAR-AE/Far-reach/settings/access](https://github.com/ASWINKUMAR-AE/Far-reach/settings/access)**
2. Click **"Add people"**.
3. Type: `prakash2006-xl` or `rskakavin@gmail.com`.
4. Select **prakash2006-xl** and click **"Add prakash2006-xl to this repository"** (choose **Write** or **Admin** role).
5. Prakash will receive an invitation email or can accept directly at:
   👉 **[https://github.com/ASWINKUMAR-AE/Far-reach/invitations](https://github.com/ASWINKUMAR-AE/Far-reach/invitations)**

---

## 💻 Step 2: Setup for Prakash (On His Computer)

When Prakash starts working:

```bash
# 1. Clone the repository
git clone https://github.com/ASWINKUMAR-AE/Far-reach.git

# 2. Go to the project folder
cd Far-reach

# 3. Switch to your personal branch
git checkout prakash

# 4. Install dependencies
npm install

# 5. Start development
npx expo start -c
```

### Daily Work Routine for Prakash:
```bash
# Pull latest updates from remote prakash branch
git pull origin prakash

# After making code changes:
git add .
git commit -m "Describe what changes you made"
git push origin prakash
```

---

## 💻 Step 3: Setup for Aswin (On Your Computer)

You can work on your dedicated branch:

```bash
# Switch to your branch
git checkout aswin

# Pull latest
git pull origin aswin

# Commit and push your changes
git add .
git commit -m "Feature description"
git push origin aswin
```

---

## 🔄 Merging Changes into `main`

When either of you completes a feature:
1. Go to **[https://github.com/ASWINKUMAR-AE/Far-reach/pulls](https://github.com/ASWINKUMAR-AE/Far-reach/pulls)**
2. Click **"New pull request"**.
3. Set Base: `main` ⟵ Compare: `aswin` or `prakash`.
4. Review changes and click **"Merge pull request"**.
5. Both team members can then sync their local branches with main:
   ```bash
   git checkout main
   git pull origin main
   git checkout <your-branch>
   git merge main
   ```

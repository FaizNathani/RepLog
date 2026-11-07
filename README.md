# RepLog

A phone-first workout app: count reps with a big tap counter, plan your week for each place you stay (Home, Dorm, Hotel…), roll skipped days over, track trends, body weight and BMI, export to Excel, and compete with friends on a leaderboard.

It's plain HTML/JS with no build step. Hosted on **GitHub Pages**, with **Firebase** for Google sign-in, sync between devices and the shared leaderboard.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app |
| `firebase-sync.js` | Connects the app to Firebase (sign-in + database) |
| `firebase-config.js` | **Your** Firebase project settings — fill this in |
| `firestore.rules` | Database security rules — paste into Firebase |
| `manifest.webmanifest`, `sw.js`, `icons/` | Make it installable and work offline |

Without `firebase-config.js` filled in, the app still works, but in "this device only" mode.

## 1. Set up Firebase (free)

1. Go to <https://console.firebase.google.com> → **Create a project** → name it `replog` → you can turn Google Analytics off.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable** → pick your support email → **Save**.
3. **Build → Firestore Database → Create database** → choose a location near you → **Start in production mode**.
4. In Firestore, open the **Rules** tab, replace everything with the contents of `firestore.rules`, and click **Publish**.
5. **Project settings** (gear icon) → **General** → **Your apps** → click the **`</>`** (Web) icon → nickname `RepLog` → **Register app** (no hosting needed). Copy the values from the `firebaseConfig` it shows into `firebase-config.js`.
6. **Authentication → Settings → Authorized domains → Add domain** → add `YOUR-GITHUB-USERNAME.github.io`.

The values in `firebase-config.js` identify your project; they aren't passwords and are fine in a public repo. Data is protected by sign-in and `firestore.rules`: each person can only read and write their own workouts, and only their own leaderboard row.

## 2. Publish on GitHub Pages

1. Create a repository (e.g. `replog`) and upload these files (not the `.claude` folder).
2. Repository **Settings → Pages** → **Source: Deploy from a branch** → Branch **main**, folder **/ (root)** → **Save**.
3. After a minute the app is live at `https://YOUR-GITHUB-USERNAME.github.io/replog/`.

## 3. Use it

- Open the link on your phone → **Sign in with Google**.
- Add it to your home screen: iPhone (Safari) **Share → Add to Home Screen**; Android (Chrome) **⋮ → Install app / Add to Home screen**.
- Friends: send them the link. They sign in with Google and tap **Join** on the **Friends** tab.

Anyone with a Google account who has the link can sign in and see the leaderboard (nicknames and totals only). Their own workouts, plans and body data are never visible to anyone else.

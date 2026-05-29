# PASCIAN-COMP-LAB Inventory System

The official inventory and laboratory management system for the PASCIAN Computer Lab.

1. **Clone the repository**: `git clone https://github.com/zoidabyte/PASCIAN-COMP-LAB.git`
2. **Install dependencies**: `npm install`
3. **Run the development server**: `npm run dev`
4. **Access the portal**: Open the provided localhost link in your browser.

* **Admin Dashboard**: Accessed via the base URL.
* **Student Portal**: Accessed by appending `?mode=student` to the URL.

This project is configured for **Vercel**. Every `git push` to the `main` branch triggers an automated CI/CD pipeline build.

* **Environment Variables**: NEVER hardcode API keys or database passwords directly into your source code. Use the Vercel dashboard to store your `RESEND_API_KEY` (or other credentials) under "Environment Variables."
* **Dependency Management**: The `node_modules/` folder is intentionally ignored via `.gitignore` to keep the repository lightweight. Always run `npm install` after cloning to restore dependencies.
* **Sensitive Data**: If you implement user authentication, ensure you are using secure serverless functions and that secret keys are never committed to your public GitHub history.
* **System Integrity**: Avoid modifying the `vercel.json` routing configuration unless you are adding new backend endpoints or changing the build output directory.

* **Frontend**: React, Vite, Tailwind CSS
* **Backend**: Vercel Serverless Functions
* **Version Control**: Git & GitHub
# **QuantiBI MVP Requirements Document**

## **Overview**

QuantiBI is a business intelligence web application designed for game companies and other businesses to easily query databases and generate insightful visualizations using plain language. It eliminates the need for data analysts by integrating AI to interpret user queries and automatically generate SQL queries and charts.

This document outlines the core functionalities, user requirements, and technical specifications to guide the development of the MVP.

---

## **Core Features**

### **1\. Authentication & User Management**

* **Login Page:**  
  * Display the app name in the top navigation bar.  
  * Centered login form with:  
    * Email input  
    * Password input  
    * "Sign In" button  
    * "Sign up for free" button (redirects to sign-up page)  
    * "Forgot password?" link (redirects to password reset page)  
* **Sign-Up Page:**  
  * Option to sign up with:  
    * Email & password  
    * Google Authentication  
  * "Already have an account? Sign In" link (redirects to login page)  
* **Password Reset Page:**  
  * Email input field  
  * "Reset Password" button  
  * Instructions for resetting password via email

### **2\. Workspaces Management**

* **Workspaces Page:**  
  * Displays a list of workspaces the user has access to  
  * If no workspaces exist, show a "Create a New Workspace" button  
  * For each workspace:  
    * "Enter Workspace" button  
    * "Manage Workspace" button (admin only)  
    * "Invite Users" button  
  * "Upgrade Plan" CTA for additional workspaces and team members  
  * Top Navigation Bar:  
    * "Workspaces" button (loads workspaces page)  
    * User profile icon with a dropdown menu:  
      * "Manage User Settings"  
      * "Sign Out"  
* Workspace settings page:  
  * Nav bar with General, members and invites, subscription plan  
  * General  
    * Allows the user to change the workspace display name  
  * Members and invites  
    * Entry for email address, role, workspaces, workspace role and invite button  
    * List of exiting members, their email and role and option to remove  
  * Subscription plan  
    * shows the users current plan, this would be the Starter plan for new users
    * Then shows the 3 panel options for the different plans (starter, Professional, Enterprise), with the features, cost and upgrade buttons

### **3\. Workspace Home Page**

* **Setup Guide Section:**  
  * Progress bar with 5 steps:  
    * **Create Workspace** (pre-completed)  
    * **Connect Data** (redirects to Datasets page)  
    * **Create a Chart** (redirects to Charts page)  
    * **Create a Dashboard** (redirects to Dashboards page)  
    * **Invite Teammates** (redirects to Workspace Settings page)  
* **Dashboards List Section:**  
  * Displays existing dashboards with:  
    * Title  
    * Type  
    * Owners  
    * Last modified date  
    * Action buttons: **Edit, Delete, Export**

### **4\. Datasets Management**

* **Datasets Page:**  
  * "Connect Database" button (opens a pop-up):  
    * **Select Database Type:**  
      * Google BigQuery, PostgreSQL, Snowflake, MySQL, Databricks, Google Sheets  
    * **Enter Connection Details** (depends on database type)  
      * Example (PostgreSQL):  
        * Host, Port, Database Name, Username, Password, Display Name, SSL options, SSH Tunnel options  
    * **Connect Button:**  
      * Attempts to connect to database  
      * If successful, closes pop-up and adds database to list  
  * "Create Dataset" button (opens a pop-up):  
    * Select database → Select schema (e.g., "etl") → Select table → Create dataset  
  * **List of Connected Databases & Datasets:**  
    * **Databases:** Name, Type, Last Modified, Edit/Delete buttons  
    * **Datasets:** Name, Type (Physical/Virtual), Database, Schema, Owners, Last Modified, Edit/Delete buttons

### **5\. Chart Creation & AI-Powered Querying**

* **Charts Page:**  
  * Displays a list of all user-created charts  
  * "Create Chart" button (opens chart creation page)  
* **Chart Creation Page:**  
  * Text box with prompt: "What chart would you like to create?"  
  * User enters natural language query (e.g., "Show D1 and D3 retention over the past month")  
  * AI interprets query:  
    * Generates required SQL based on connected database & datasets  
    * Suggests dataset creation if needed  
    * Automatically selects best chart type  
  * **Chart Editing:**  
    * **Left Panel:** Chart Type Selection (Bar, Line, Pie, etc.)  and styling
    * **Right Panel:** AI Chat for further modifications (e.g., "Make lines purple")  
    * "Save" button (opens pop-up to name chart & select/add a dashboard)  
    * "Cancel" button (triggers confirmation modal)

### **6\. Dashboard Management**

* **Dashboards Page:**  
  * List of existing dashboards with "Create New Dashboard" button  
* **Dashboard Editor:**  
  * Displays selected charts with:  
    * Filters on the left panel  
    * Charts arranged on a grid  
  * Top-right options: **Share, Edit**  
  * **Edit Mode:**  
    * Drag & resize charts  
    * Delete charts  
    * Update filters

## **7\. User Permissions & Access Control**

* Only workspace owners/admins can invite users and manage settings.  
* Users can be assigned different roles with varying permissions.  
* Access to dashboards, charts, and datasets is controlled via permissions.

## **8\. Additional Features & Future Considerations**

* AI-powered recommendations for charts and dashboards.  
* API integrations for external data sources.  
* Custom theming and branding for enterprise users.  
* Real-time data sync for connected databases.

---

## **Technical Stack**

* **Frontend:**  
  * React.js \+ Tailwind CSS  
  * Authentication with Firebase/Auth0  
  * AI-driven chart generation (OpenAI API / LangChain)  
  * Charting library (Recharts / Chart.js / ECharts)  
* **Backend:**  
  * Node.js \+ Express.js (or Django/FastAPI for Python backend)  
  * PostgreSQL for user & workspace management  
  * Integration with external databases (BigQuery, Snowflake, etc.)  
  * API Layer for AI query interpretation  
* **Hosting & Deployment:**  
  * Vercel for frontend  
  * AWS/GCP/Azure for backend & database handling  
  * Cursor for AI-powered development assistance


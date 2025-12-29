# Testing Guide: Corporate Problem Statements Feature

## How to Access the Problem Creators Interface

1. **Login as Admin**
   - Go to `http://localhost:3000/login`
   - Login with an admin account

2. **Navigate to Admin Dashboard**
   - Click on "Admin" in the navbar
   - Or go directly to `http://localhost:3000/admin/dashboard`

3. **Open Problem Creators Tab**
   - In the Admin Dashboard, click on the **"Problem Creators"** tab
   - It's the last tab in the navigation (with a user-tie icon)

## Interface Features

### Current Problem Creators Section
- Shows all users who currently have problem creator status
- Displays their username, email, and roles
- Allows you to remove problem creator status

### All Users Section
- Shows a complete list of all users in the system
- **Search functionality**: Type in the search box to filter users by username or email
- Each user row shows:
  - Username
  - Email
  - Current roles (Admin, Problem Creator, or Regular User)
  - Action button to make them a problem creator (if they're not already one)

## How to Make a User a Problem Creator

1. **Find the user** in the "All Users" table
   - Use the search box if needed to find them quickly
   
2. **Click "Make Problem Creator"** button
   - The button is green and located in the Actions column
   - You'll be asked to confirm the action
   
3. **Success!**
   - The user will now appear in the "Current Problem Creators" section
   - They will be able to create corporate problem statements

## Testing the Full Flow

### Step 1: Make a User a Problem Creator
1. Login as admin
2. Go to Admin Dashboard → Problem Creators tab
3. Find a user (or create a test user first)
4. Click "Make Problem Creator"

### Step 2: Login as Problem Creator
1. Logout from admin account
2. Login as the user you just made a problem creator
3. You should now see "Corporate Problems" in the navbar

### Step 3: Create a Corporate Problem
1. Click on "Corporate Problems" in the navbar
2. Click "Create New Problem" button
3. Fill in the form:
   - Title: e.g., "Reduce Plastic Waste in Schools"
   - Description: Detailed description of the problem
   - Category: (optional) e.g., "Environment"
   - Problem Statement Details (optional):
     - Who has the problem?
     - What is the problem?
     - Expected benefit?
4. Click "Create Problem Statement"

### Step 4: Test Adoption (as Regular User)
1. Logout from problem creator account
2. Login as a regular user
3. Go to "Corporate Problems" tab
4. You should see the problem you created
5. Click "View Details" or "Adopt"
6. Click "Adopt This Problem & Start Innovation Process"
7. This will create a new project under the user's account
8. The user can now work through the innovation process

## Troubleshooting

### Problem: Can't see Problem Creators tab
- **Solution**: Make sure you're logged in as an admin
- Refresh the page (Ctrl+R or Cmd+R)

### Problem: No users showing in the table
- **Solution**: Make sure there are users in the database
- Check if the server is running properly
- Check browser console for errors

### Problem: "Make Problem Creator" button not working
- **Solution**: 
  - Check browser console for errors
  - Make sure the user is not already a problem creator
  - Verify the route is correct: `/admin/users/:userId/make-problem-creator`

### Problem: User can't create corporate problems
- **Solution**: 
  - Verify the user has `isProblemCreator: true` in the database
  - Check if they can see the "Create New Problem" button
  - Make sure they're logged in

## Quick Test Checklist

- [ ] Admin can see Problem Creators tab
- [ ] Admin can see list of all users
- [ ] Search functionality works (type in search box)
- [ ] Admin can make a user a problem creator
- [ ] Problem creator appears in "Current Problem Creators" section
- [ ] Problem creator can see "Corporate Problems" in navbar
- [ ] Problem creator can create new corporate problems
- [ ] Regular users can see corporate problems
- [ ] Regular users can adopt corporate problems
- [ ] Adopted problems create new projects under user's account

## Database Verification

To check if a user is a problem creator in the database:
```javascript
// In MongoDB shell or through your database tool
db.users.find({ isProblemCreator: true })
```

To manually set a user as problem creator:
```javascript
db.users.updateOne(
  { username: "testuser" },
  { $set: { isProblemCreator: true } }
)
```


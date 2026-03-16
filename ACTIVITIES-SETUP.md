# Activities Setup Guide

Activities are things you encourage your kids to do, but aren't required like chores. They can be done multiple times per week with configurable limits.

## Activities Sheet Setup

### 1. Create the Activities Sheet

In your Google Sheet, create a new tab called **"Activities"** (case-sensitive).

### 2. Set Up the Activities Table

In the Activities sheet, create a table with these headers in Row 1:

| Kid | Activity ID | Activity Name | BP | Max Per Week | Multiplier |
|-----|-------------|---------------|-----|--------------|------------|

### 3. Add Your Activities

There are two types of activities:
- **Individual**: Assigned to a specific kid (put kid's name in Kid column)
- **Shared**: Any kid can complete (leave Kid column blank)

#### Example Activities Configuration:

| Kid | Activity ID | Activity Name | BP | Max Per Week | Multiplier |
|-----|-------------|---------------|-----|--------------|------------|
| Clara | reading | Reading 20 min | 2 | 7 | 1 |
| Clara | exercise | Exercise | 3 | 3 | 1 |
| Clara | help-sibling | Help Sibling | 1 | 5 | 1 |
| Champ | reading | Reading 20 min | 1 | 7 | 1 |
| Champ | exercise | Exercise | 2 | 3 | 1 |
|  | practice | Practice Instrument | 2 | 5 | 1 |
|  | outdoor-play | Outdoor Play 30 min | 1 | 7 | 1 |

### Column Descriptions:

- **Kid**: The kid's name for individual activities. Leave blank for shared activities that anyone can do.
- **Activity ID**: A unique identifier (lowercase, no spaces). Examples: `reading`, `exercise`, `practice`
- **Activity Name**: The display name shown in the dashboard
- **BP**: Behavior Points earned each time activity is completed
- **Max Per Week**: Maximum number of times this activity can be completed per week (7 = daily, 1 = once per week, etc.)
- **Multiplier**: Multiplies the BP earned (use `1` for normal activities). Set to `0` to hide/disable an activity without deleting it.

### Understanding Max Per Week:

- **7** = Can do daily (once per day)
- **3** = Can do 3 times per week
- **1** = Can do once per week
- **14** = Can do twice per day (2 × 7 days)

The dashboard tracks completions per week (Monday-Sunday) and shows progress like "2/7" or "3/3".

### How Activities Work:

1. **Kid marks activity complete** - Activity shows updated count (e.g., "3/7")
2. **BP awarded immediately** - No parent approval needed (encouragement vs requirement)
3. **Weekly reset** - Counts reset automatically each Monday at midnight
4. **Max reached** - Activity shows "Complete!" when max per week is reached

### Key Differences from Chores:

✅ **No approval needed** - Activities award BP immediately
✅ **Multiple completions** - Can be done multiple times per week
✅ **Weekly tracking** - Counts reset each Monday
✅ **Encouragement** - Optional vs required

---

## Activities Sheet Structure

Your Google Sheet should now have these tabs:
1. **Points Log** - Transaction history
2. **Config** - Dashboard configuration (PIN, kids, settings)
3. **Chores** - Chores configuration
4. **Rewards** - Rewards configuration
5. **Activities** - Activities configuration (NEW!)

---

## Troubleshooting

**Dashboard shows "No activities configured":**
- Make sure the sheet is named exactly **"Activities"** (case-sensitive)
- Verify Row 1 has headers: Kid, Activity ID, Activity Name, BP, Max Per Week, Multiplier
- Make sure your Apps Script is deployed and updated
- Check that activities have a Multiplier > 0 (0 or blank will hide them)

**Activities not appearing:**
1. Open Apps Script editor
2. Run the `getActivities` function
3. Check the log output to see if data is being read correctly
4. Make sure there are no empty rows in the middle of your data

**Activity counts not resetting:**
- Counts reset automatically each Monday at midnight
- Manual reset: Clear your browser's localStorage for the dashboard

---

## Different Points for Different Kids

To give different kids different points for the same activity, simply add separate rows:

| Kid | Activity ID | Activity Name | BP | Max Per Week | Multiplier |
|-----|-------------|---------------|-----|--------------|------------|
| Clara | reading | Reading 20 min | 2 | 7 | 1 |
| Champ | reading | Reading 20 min | 1 | 7 | 1 |

Clara gets 2 BP per reading session, Champ gets 1 BP. Each tracks their own count separately!

# Activities Setup Guide

Activities are things you encourage your kids to do, but aren't required like chores. Unlike chores which are expected, activities are optional positive behaviors you want to reinforce.

## Activities Sheet Setup

### 1. Create the Activities Sheet

In your Google Sheet, create a new tab called **"Activities"** (case-sensitive).

### 2. Set Up the Activities Table

In the Activities sheet, create a table with these headers in Row 1:

| Kid | Activity ID | Activity Name | BP | Multiplier |
|-----|-------------|---------------|-----|------------|

### 3. Add Your Activities

There are two types of activities:
- **Individual**: Assigned to a specific kid (put kid's name in Kid column)
- **Shared**: Any kid can complete (leave Kid column blank)

#### Example Activities Configuration:

| Kid | Activity ID | Activity Name | BP | Multiplier |
|-----|-------------|---------------|-----|------------|
| Clara | reading | Reading 20 min | 2 | 1 |
| Clara | exercise | Exercise | 3 | 1 |
| Clara | help-sibling | Help Sibling | 1 | 1 |
| Champ | reading | Reading 20 min | 1 | 1 |
| Champ | exercise | Exercise | 2 | 1 |
|  | practice | Practice Instrument | 2 | 1 |
|  | outdoor-play | Outdoor Play 30 min | 1 | 1 |

### Column Descriptions:

- **Kid**: The kid's name for individual activities. Leave blank for shared activities that anyone can do.
- **Activity ID**: A unique identifier (lowercase, no spaces). Examples: `reading`, `exercise`, `practice`
- **Activity Name**: The display name shown in the dashboard
- **BP**: Behavior Points earned when activity is approved
- **Multiplier**: Multiplies the BP earned (use `1` for normal activities). Set to `0` to hide/disable an activity without deleting it.

### Daily Limit:

**Each activity can only be completed once per day.** This keeps activities special and prevents gaming the system. Activities reset automatically at midnight.

### How Activities Work:

1. **Kid clicks "Complete"** - Kid selector popup appears (always shows, even for individual activities)
2. **Kid selects themselves** - Activity shows as "pending" (⏳) for that kid
3. **Other kids can also complete** - Multiple kids can mark the same activity pending (great for group activities!)
4. **Parent approves each kid individually** - Each kid gets their own approve (✓) and reject (✗) button
5. **More kids can join** - Even after some kids are pending, others can still mark complete using the "+" button
6. **Daily reset** - All activities reset automatically at midnight

**Example:** "Outdoor Play 30 min" - Clara marks complete, then Champ marks complete. Parent sees both kids pending and can approve/reject them separately. Both earn BP!

### Key Differences from Chores:

✅ **Encouragement** - Optional positive behaviors vs required tasks
✅ **Once per day** - Each activity can only be done once daily per kid
✅ **Kid selector always shows** - Makes it clear who completed the activity
✅ **Multiple kids can complete** - Perfect for activities kids do together
✅ **Requires approval** - Parent verifies the activity was actually done

---

## Activities Sheet Structure

Your Google Sheet should now have these tabs:
1. **Points Log** - Transaction history
2. **Config** - Dashboard configuration (PIN, kids, settings)
3. **Chores** - Chores configuration
4. **Rewards** - Rewards configuration
5. **Activities** - Activities configuration

---

## Troubleshooting

**Dashboard shows "No activities configured":**
- Make sure the sheet is named exactly **"Activities"** (case-sensitive)
- Verify Row 1 has headers: Kid, Activity ID, Activity Name, BP, Multiplier
- Make sure your Apps Script is deployed and updated
- Check that activities have a Multiplier > 0 (0 or blank will hide them)

**Activities not appearing:**
1. Open Apps Script editor
2. Run the `getActivities` function
3. Check the log output to see if data is being read correctly
4. Make sure there are no empty rows in the middle of your data

**Activity not resetting:**
- Activities reset automatically at midnight
- Manual reset: Clear your browser's localStorage for the dashboard

---

## Different Points for Different Kids

To give different kids different points for the same activity, simply add separate rows:

| Kid | Activity ID | Activity Name | BP | Multiplier |
|-----|-------------|---------------|-----|------------|
| Clara | reading | Reading 20 min | 2 | 1 |
| Champ | reading | Reading 20 min | 1 | 1 |

Clara gets 2 BP per reading session, Champ gets 1 BP. Each kid can complete it once per day!

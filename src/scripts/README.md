# Seed Scripts

## Seed Today's Data

This script adds sample data for "new company" for today's date across all modules.

### What it creates:

1. **Employees** (5 employees):
   - John Reception (reception department)
   - Sarah Housekeeping (housekeeping department)
   - Mike Operations (operations department)
   - Emma Food (food-beverage department)
   - David Manager (manager role)

2. **Operations** (18 operations for today):
   - **Check-ins**: 3 check-ins (Rooms 101, 102, 103)
   - **Meal Markers**: 3 meal markers (breakfast, lunch, dinner)
   - **Food Images**: 2 food image operations
   - **Food Feedback**: 2 food feedback operations
   - **Welfare Checks**: 2 welfare check operations
   - **Service Requests**: 2 service requests (housekeeping)
   - **Maintenance**: 1 maintenance operation
   - **Other Operations**: 3 operations (observation, safeguarding, incident report)

3. **Rotas** (5 schedules for today):
   - Morning shifts for reception and housekeeping
   - Afternoon shift for operations
   - Custom shifts for food service and manager

### How to run:

```bash
cd backend
npm run seed:today
```

### Notes:

- The script will find or create "new company"
- If employees already exist, it will use them
- If rotas already exist for today, it will skip creating duplicates
- All data is created with today's date
- All operations are linked to the company and employees

### Company ID:

The script uses company name "new company" to find the company. If it doesn't exist, it will create it.



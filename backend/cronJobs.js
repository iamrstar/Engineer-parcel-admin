const cron = require('node-cron');
const RecurringTask = require('./models/RecurringTask');
const Task = require('./models/Task');

// Run this check every minute
// In a real production system, you might want a more sophisticated cron worker.
cron.schedule('* * * * *', async () => {
  try {
    const activeRecurringTasks = await RecurringTask.find({ isActive: true });
    
    // Check which ones need to run
    for (const recTask of activeRecurringTasks) {
      try {
        // Evaluate the cron expression
        // We use node-cron to validate if the current minute matches the cron expression
        const isValid = cron.validate(recTask.cronExpression);
        if (!isValid) continue;

        // node-cron doesn't have a built-in "is this expression true right now?" method directly exposed that matches exactly this minute easily without parsing.
        // A common pattern is to just let node-cron handle the scheduling at startup.
        // Wait, dynamic cron scheduling:
      } catch (err) {
        console.error("Error processing recurring task:", err);
      }
    }
  } catch (error) {
    console.error('Error in recurring tasks cron job:', error);
  }
});

// A better way to handle dynamic recurring tasks with node-cron:
const activeJobs = new Map();

const initializeRecurringTasks = async () => {
    try {
        const tasks = await RecurringTask.find({ isActive: true });
        tasks.forEach(task => {
            scheduleTask(task);
        });
    } catch (error) {
        console.error("Failed to initialize recurring tasks:", error);
    }
}

const scheduleTask = (recurringTask) => {
    if (activeJobs.has(recurringTask._id.toString())) {
        activeJobs.get(recurringTask._id.toString()).stop();
    }

    if (!recurringTask.isActive) return;

    if (!cron.validate(recurringTask.cronExpression)) {
        console.error(`Invalid cron expression for task ${recurringTask._id}: ${recurringTask.cronExpression}`);
        return;
    }

    const job = cron.schedule(recurringTask.cronExpression, async () => {
        try {
            console.log(`Executing recurring task: ${recurringTask.title}`);
            const newTask = new Task({
                title: recurringTask.title,
                description: recurringTask.description,
                type: recurringTask.type,
                priority: recurringTask.priority,
                assignedTo: recurringTask.assignedTo,
                assignedBy: recurringTask.assignedBy,
            });
            await newTask.save();
            
            recurringTask.lastGeneratedAt = new Date();
            await recurringTask.save();
        } catch (err) {
            console.error(`Failed to execute recurring task ${recurringTask._id}:`, err);
        }
    });

    activeJobs.set(recurringTask._id.toString(), job);
}

// Check every 5 minutes for new or updated recurring tasks from the DB to sync
cron.schedule('*/5 * * * *', initializeRecurringTasks);

// Initial load
initializeRecurringTasks();

module.exports = {
    scheduleTask,
    activeJobs
};

import { DateTime } from "luxon";

/*
Currently no way to use Obsidian in standalone module development.
This prevents creating example .md files and querying them with Dataview to test out the code.

So we need a simple mocking of DataView's task return
*/

// Note need to deep copy this when using!
const DEFAULTS = {
    completed: false,
    fullyCompleted: false,
    subtasks: {values: []},
    link: {path: "Projects/project.md"},
    text: "blah",
    path: "Projects/project.md"
};

let line = 0;

function newTaskList(){
    return {values: []};

}

// modifies taskList in place
function addTaskTo(taskList, properties={}){

    // add the defaults
    for (const [key, value] of Object.entries(DEFAULTS)) {
        if (!(key in properties)) {
            // need to deep copy the value to prevent modifying default
            properties[key] = JSON.parse(JSON.stringify(value));
        }
    }

    // add the line
    if (!('line' in properties)) {
        properties.line = line;
        line += 1;
    }

    // add created - by Default DataView created is a luxon DateTime
    if (!('created' in properties)) {
        properties.created = DateTime.now();
    }

    taskList.values.push(properties);

    return properties;
}

// simple wrapper to add a task to the task.subtasks
function addSubTaskTo(task, properties={}) {
    return addTaskTo(task.subtasks, properties);
}

function markFullyCompleted(taskList) {
    let result = true;

    taskList.values.forEach((task) => {

        // if the task is complete and its subtasks are all complete, it's fully complete
        let subsComplete = markFullyCompleted(task.subtasks);
        if (subsComplete && 'completed' in task && task.completed) {
            task.fullyCompleted = true;
        } else {
            task.fullyCompleted = false;
            result = false;
        }

    });

    return result;
}

export { newTaskList, addTaskTo, addSubTaskTo, markFullyCompleted };
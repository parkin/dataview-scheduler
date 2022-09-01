// import moment from 'moment';
// when require'ing script in Obsidian, moment cannot be found to require, but it's already in the namespace.
// So, if we fail to require moment, we're in Obsidan, and just load the local copy of moment there.
try {
  var moment = require("moment");
} catch (e) {
  // in Obsidian, moment not available for require.
  // try loading from local folder
  var moment = require(app.vault.adapter.basePath + "/code/moment.min.js");
}

// Note need to deep copy this when using!
const DEFAULT_PRIORITY = 0;
const _DEFAULT_DURATION = moment.duration(2, 'h');

function getDefaultDuration() {
  return _DEFAULT_DURATION.clone();
}

// creates a simple text key to use for the path
function taskKey(task) {
  return task.link.path + " line: " + task.line;
}

// Creates a flat array of pointers to all the tasks
// Has side effect of adding a key to every task
function createFlatTaskArray(tasks, result = []) {

  tasks.values.forEach((item) => {
    if (!('key' in item)) {
      item.key = taskKey(item);
    }

    result.push(item);

    createFlatTaskArray(item.subtasks, result);
  });

  return result;
}

// propagates parents priorities to children, or sets default if not set
// expects each object to have a key
// adds a .parent and .predessesorLinks to each task
function propagateProperties(tasks, priority = DEFAULT_PRIORITY, parent = null, flatTasks = null) {
  // ensure there are keys and a flat array
  if (flatTasks == null) {
    flatTasks = createFlatTaskArray(tasks);
  }

  tasks.values.forEach((item) => {

    //parent
    if (parent != null) {
      item.parent = parent;
    }

    // set default duration
    if (!('duration' in item)) {
      item.duration = getDefaultDuration();
    }

    // cast dates as moments where possible
    if ('due' in item) {
      item.due = moment(item.due.toString());
    }
    if ('start' in item) {
      item.start = moment(item.start.toString());
    }
    if ('created' in item) {
      // default created tag in DataView is a luxon DateTime
      item.created = moment(item.created.toString());
    }
    if ('eta' in item) {
      // use toString in case DataView passes DateTime as eta (and not moment)
      item.eta = moment(item.eta.toString());
    }

    // propagate due dates downward
    if ('parent' in item && 'due' in item.parent && (!('due' in item) || item.parent.due.isBefore(item.due))) {
      item.due = item.parent.due.clone();
    }

    // propagate priorities downard
    if ('parent' in item && 'priority' in item.parent && (!('priority' in item) || item.parent.priority > item.priority)) {
      item.priority = item.parent.priority;
    } else if (!('priority' in item)) {
      // else set default priority
      item.priority = 0;
    }

    // predecessors
    if (!('predecessorLinks' in item)) {
      item.predecessorLinks = [];
    }
    if ('predecessors' in item) {
      item.predecessors.forEach((pred_key) => {
        // get the actual pred object
        let pred = flatTasks.find(e => e.key === pred_key);
        if (pred != undefined) {
          item.predecessorLinks.push(pred);
        }
      });
    }

    // propagate to the children
    propagateProperties(item.subtasks, item.priority, item, flatTasks);
  });
}

// calculates the urgency based on priority and due date
function calculateUrgency(tasks) {
  tasks.values.forEach((item) => {
    item.urgency = 0;

    if (item.fullyCompleted) {
      item.urgency = -1;
    } else {

      //## due date urgency
      if ('due' in item) {

        if (!moment.isMoment(item.due)) {
          // for some reason as parsed they are DateTime.
          // turn them into moment's
          item.due = moment(item.due.toString());
        }

        if (item.due.isSameOrBefore(moment().subtract(7, 'days'))) {
          // if due more than 7 days ago
          let x = moment().diff(item.due, 'days');

          item.urgency += 12 + (x - 7) ** 0.5 / (15 ** 0.5);

        } else if (item.due.isBefore(moment().add(14, 'days'))) {
          // if due between 7 ago and 14 in the future

          // should be 21 for things due 7 days ago
          // and 0.2 for something due in 14 days
          let x = moment().diff(item.due, 'hours') / 24.0 + 14;

          // square it to weight towards older
          // normalize to 12
          x = 12 * (x ** 2) / (21.0 ** 2);

          item.urgency += x + 0.2;
        } else {
          // if due date > 14 days
          item.urgency += 0.2;
        }

      }

      //## priority urgency
      if ('priority' in item) {

        if (item.priority >= 0) {
          item.urgency += 8 * (item.priority ** 0.5) / (100.0 ** 0.5);
        } else {
          item.urgency += 8 * (item.priority / 100.0);
        }

      }
    }

    calculateUrgency(item.subtasks);

  });
}

/**
 * 
 * @param {*} s - string
 * @returns string with "[tag::result]" like annotations stripped
 */
function stripAnnotationsFromString(s) {
  // see https://stackoverflow.com/questions/546433/regular-expression-to-match-balanced-parentheses for example of ignoring nested brackets/parenthesis
  return s.replace(/\[[^\s-]*::(?:[^\]\[]+|\[(?:[^\]\[]+|\[[^\]\[]*\])*\])*\]/gm, "").trim();
}

/**
 * 
 * @param {*} taskList 
 * 
 * Modifies taskList object in place.
 * Modifies each task.text item to remove annotations like [sample:: annotation]
 */
function stripAnnotationsFromTaskList(taskList) {
  taskList.values.forEach((task) => {
    if ('text' in task) {
      task.text = stripAnnotationsFromString(task.text);
    }

    stripAnnotationsFromTaskList(task.subtasks);
  });
}

/**
 * 
 * @param {*} time - a moment()
 * @returns - a different moment() at the next available weekday 1-5pm at or after `time`
 */
function nextWorkTime(time) {
  // get the next Mon-Fri 1pm-5pm time at or after `time`

  let result = time.clone();

  if (time.isoWeekday() > 5 || (time.isoWeekday() == 5 && time.hour() >= 17)) {
    // if it's a weekend or Fri after 5pm, set to next Monday 1pm
    result.isoWeekday(8).hour(13).minute(0).second(0).millisecond(0);
  } else if (time.hour() >= 17) {
    // if after 5, set to next day 1pm
    result.isoWeekday(result.isoWeekday() + 1).hour(13).minute(0).second(0).millisecond(0);
  } else if (time.hour() < 13) {
    // if before 1pm, set to 1pm
    result.hour(13).minute(0).second(0).millisecond(0);
  }

  return result;
}


// flattasks should be already sorted by urgency
function _scheduleRecursive(flatTasks, scheduleStart, schedule = {}, predKeyCheck = []) {
  // add the manually scheduled to the schedule first
  _scheduleManual(flatTasks, scheduleStart, schedule);

  // now schedule the 'auto' (non-manual) tasks
  _scheduleRecursiveAuto(flatTasks, scheduleStart, schedule, predKeyCheck);

  return schedule;
}

function _scheduleRecursiveAuto(flatTasks, scheduleStart, schedule = {}, predKeyCheck = []) {
  flatTasks.forEach((task) => {

    // proposed start time
    let proposedStart = nextWorkTime(scheduleStart);

    // make sure it's not scheduled
    if (!('_scheduled' in task && task._scheduled)) {
      // ensure we're not in a predecessor loop
      if (predKeyCheck.includes(task.key)) {
        throw new Error("Predecessor loop detected at key: " + task.key + ", with prior path: " + JSON.stringify(predKeyCheck));
      } else {
        predKeyCheck.push(task.key);
      }

      // set the scheduled flag false by default
      task._scheduled = false;

      // if there are predecessors, schedule those first
      if ('predecessorLinks' in task && task.predecessorLinks.length > 0) {
        // sort predecessors
        task.predecessorLinks.sort((a, b) => b.urgency - a.urgency);

        _scheduleRecursiveAuto(task.predecessorLinks, scheduleStart, schedule, predKeyCheck);

        // get the last eta of the predecessors
        let maxEta = moment.max(task.predecessorLinks.map(e => e.eta));
        if (proposedStart.isBefore(maxEta)) {
          proposedStart = nextWorkTime(maxEta);
        }
      }

      if (task.subtasks.values.length > 0) {
        // this is a parent
        // if there are subtasks, schedule those first
        let subFlat = createFlatTaskArray(task.subtasks);
        subFlat.sort((a, b) => b.urgency - a.urgency);

        _scheduleRecursiveAuto(subFlat, scheduleStart, schedule, predKeyCheck);

        // get the last eta of the predecessors
        let maxEta = moment.max(subFlat.map(e => e.eta));
        if (proposedStart.isBefore(maxEta)) {
          proposedStart = nextWorkTime(maxEta);
        }

        // set the parent eta's based on children
        // ok now we have a proposed Start
        task.etaStart = moment.min(subFlat.map(e => e.etaStart)).clone();
        // now let's calculate the eta
        // task.eta = moment.max(subFlat.map(e => e.eta)).clone();
        task.eta = proposedStart.clone();

        task.duration = moment.duration(task.eta.diff(task.etaStart));

      } else {
        // this is a "leaf"
        // by now we've scheduled all predecessors

        // if there's an owner, careful schedule (unless marked parallel)
        if ('owner' in task && !('parallel' in task && task.parallel)) {
          // schedule the task, may need to move out proposed time
          // only schedule by owner if there are not subtasks
          // get the max scheduled task of the owner
          if (!(task.owner in schedule && schedule[task.owner].length > 0)) {
            schedule[task.owner] = [];
          } else {
            // may have already scheduled tasks much later if there are high urgent predecessors
            // We should try to schedule the new task earlier than any existing one
            //sort owners tasks by etaStart
            schedule[task.owner].sort((a, b) => a.etaStart.diff(b.etaStart, 'seconds'));

            schedule[task.owner].forEach(ownerTask => {
              if (!task._scheduled) {
                if (proposedStart.isSameOrAfter(ownerTask.eta)) {
                  // the proposed start is after this task, so we'll have to check later tasks
                } else if (proposedStart.clone().add(task.duration).isSameOrBefore(ownerTask.etaStart)) {
                  // we can schedule now if the task will finish before this ownerTask
                  task._scheduled = true;
                } else {
                  proposedStart = nextWorkTime(ownerTask.eta);
                }
              }
            });

          }
          schedule[task.owner].push(task);
        } else {
          if (!('tasks_can_run_in_parallel' in schedule)) {
            schedule.tasks_can_run_in_parallel = [];
          }
          schedule.tasks_can_run_in_parallel.push(task);
        }

        // make sure we have a duration
        if (!('duration' in task)) {
          task.duration = getDefaultDuration();
        }

        // ok now we have a proposed Start
        task.etaStart = proposedStart.clone();
        // now let's calculate the eta
        task.eta = nextWorkTime(proposedStart.clone().add(task.duration));
      }

      // as a final thing - flag the task as scheduled
      task._scheduled = true;
    }

  });
}

function _scheduleManual(flatTasks, scheduleStart, schedule) {
  // go through the manual scheduled tasks first
  flatTasks.filter(e => 'manual' in e && e.manual && !('_scheduled' in e && e._scheduled)).forEach(task => {
    task._scheduled = true;

    if ('etaStart' in task) {
      //cast as moment
      task.etaStart = moment(task.etaStart.toString());
    } else if ('start' in task) {
      task.etaStart = task.start.clone();
    } else if ('created' in task) {
      // task.created added by Dataview is a luxon DateTime object
      task.etaStart = moment(task.created.toString());
    }

    if ('eta' in task) {
      // nothing needed, no need to calculate eta that already exists
    } else if ('due' in task) {
      task.eta = moment(task.due).clone();
    } else if ('duration' in task) {
      task.eta = task.etaStart.clone().add(task.duration);
    } else {
      // last resort add default duration
      task.eta = task.etaStart.clone().add(getDefaultDuration());
    }

    // add to the correct owner in the schedule
    if ('owner' in task && !('parallel' in task && task.parallel)) {
      if (!(task.owner in schedule)) {
        schedule[task.owner] = [];
      }
      schedule[task.owner].push(task);

    } else {
      if (!('tasks_can_run_in_parallel' in schedule)) {
        schedule.tasks_can_run_in_parallel = [];
      }
      schedule.tasks_can_run_in_parallel.push(task);
    }

  });

  // then go through the completed tasks
  flatTasks.filter(e => 'fullyCompleted' in e && e.fullyCompleted && !('_scheduled' in e && e._scheduled)).forEach(task => {
    task._scheduled = true;

    // set the eta start
    if ('etaStart' in task) {
      // cast as moment
      task.etaStart = moment(task.etaStart.toString());
    } else if ('start' in task) {
      task.etaStart = task.start.clone();
    } else if ('created' in task) {
      // Obsidian adds a created tag automatically, by default it's a luxon DateTime
      task.etaStart = moment(task.created.toString());
    }

    if ('completion' in task) {
      task.eta = moment(task.completion).clone();
    } else if ('eta' in task) {
      // nothing needed
    } else if ('due' in task) {
      task.eta = moment(task.due).clone();
    } else if ('duration' in task) {
      task.eta = task.etaStart.clone().add(task.duration);
    } else {
      // last resort add default duration
      task.eta = task.etaStart.clone().add(getDefaultDuration());
    }
    // now ensure eta is before the schedule start
    if (task.eta.isAfter(scheduleStart)) {
      task.eta = scheduleStart.clone();
    }

    // add to the correct owner in the schedule
    if ('owner' in task) {
      if (!(task.owner in schedule)) {
        schedule[task.owner] = [];
      }
      schedule[task.owner].push(task);

    } else {
      if (!('tasks_can_run_in_parallel' in schedule)) {
        schedule.tasks_can_run_in_parallel = [];
      }
      schedule.tasks_can_run_in_parallel.push(task);
    }

  });
}

function addKeys(taskList) {
  taskList.values.forEach((item) => {
    if (!('key' in item)) {
      item.key = item.link.path + " line: " + item.line
    }
    addKeys(item.subtasks);
  });
}

function getDuplicateKeys(flatTasks) {
  var uniq = flatTasks
    .map((task) => {
      return {
        count: 1,
        key: task.key
      }
    })
    .reduce((a, b) => {
      a[b.key] = (a[b.key] || 0) + b.count
      return a
    }, {})

  var duplicates = Object.keys(uniq).filter((a) => uniq[a] > 1);
  return duplicates;

}

function addAnnotations(taskList) {
  taskList.values.forEach(task => {
    // if priority
    if ('priority' in task && task.priority > 0) {
      task.text += " [priority::" + task.priority + "]";
    }

    // if due
    if ('due' in task) {
      task.text += " [due::" + task.due.format("YYYY-MM-DD") + "]";
    }

    // eta
    if ('eta' in task) {
      task.text += " [eta::";

      // if eta is overdue
      if ('due' in task && task.due.isSameOrBefore(task.eta)) {
        task.text += '<font color="red"><b>' + task.eta.format("YYYY-MM-DD") + '</b></font>';
      } else {
        task.text += task.eta.format("YYYY-MM-DD");
      }

      task.text += "]";
    }

    // owner

    if ('owner' in task) {
      task.text += " [owner::" + task.owner + "]";
    }

    // recursively call subtasks
    addAnnotations(task.subtasks);
  });
}

function replaceAnnotations(taskList) {
  // first strip
  stripAnnotationsFromTaskList(taskList);

  // then replace
  addAnnotations(taskList);
}

function scheduleTasks(taskList, options = {}) {
  let scheduleStart = moment();
  // get the schedule start from options
  if ('scheduleStart' in options) {
    scheduleStart = options.scheduleStart.clone();
  }

  //add keys
  addKeys(taskList);

  let flatTasks = createFlatTaskArray(taskList);

  // throw error if duplicate keys
  let duplicateKeys = getDuplicateKeys(flatTasks);
  if (duplicateKeys.length > 0) {
    throw new Error("Attribute [key::]] is duplicated: " + JSON.stringify(duplicateKeys));
  }

  // //propagate priorities
  propagateProperties(taskList);

  // calculate urgency
  calculateUrgency(taskList);

  // sort urgency in descending order order
  flatTasks.sort((a, b) => b.urgency - a.urgency);

  // loop through flat tasks to schedule

  let schedule = _scheduleRecursive(flatTasks, scheduleStart);

  // strip/replace the annotations
  replaceAnnotations(taskList);


  return schedule;
}



export {
  createFlatTaskArray,
  taskKey,
  propagateProperties,
  calculateUrgency,
  stripAnnotationsFromString,
  stripAnnotationsFromTaskList,
  scheduleTasks,
  nextWorkTime
};
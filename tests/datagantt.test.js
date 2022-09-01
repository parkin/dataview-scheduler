import * as dvg from '../datagantt';
import * as dvMocks from './mocks';
import moment from 'moment';
import { DateTime } from 'luxon';

describe('createFlatTaskArray', () => {

  test('flattens one task with one subtask', () => {

    let taskList = dvMocks.newTaskList();
    let task = dvMocks.addTaskTo(taskList);
    let subtask = dvMocks.addSubTaskTo(task);

    expect(taskList.values.length).toBe(1);
    expect(task.subtasks.values.length).toBe(1);
    expect(subtask.subtasks.values.length).toBe(0);

    let flatArray = dvg.createFlatTaskArray(taskList);
    expect(flatArray.length).toBe(2);

    // ensure we find both lines in the flat array
    expect(flatArray.findIndex(e => e.line == task.line)).toBeGreaterThanOrEqual(0);
    expect(flatArray.findIndex(e => e.line == subtask.line)).toBeGreaterThanOrEqual(0);

  });

  test('flattens two tasks each with one subtask', () => {
    let taskList = dvMocks.newTaskList();

    let t1 = dvMocks.addTaskTo(taskList);
    let s1 = dvMocks.addSubTaskTo(t1);

    let t2 = dvMocks.addTaskTo(taskList);
    let s2 = dvMocks.addSubTaskTo(t2);

    let flatArray = dvg.createFlatTaskArray(taskList);
    expect(flatArray.length).toBe(4);

    // ensure we find both lines in the flat array
    expect(flatArray.findIndex(e => e.line == t1.line)).toBeGreaterThanOrEqual(0);
    expect(flatArray.findIndex(e => e.line == s1.line)).toBeGreaterThanOrEqual(0);
    expect(flatArray.findIndex(e => e.line == t2.line)).toBeGreaterThanOrEqual(0);
    expect(flatArray.findIndex(e => e.line == s2.line)).toBeGreaterThanOrEqual(0);
  });

  test('returns empty array when no tasks', () => {

    let taskList = dvMocks.newTaskList();

    let flatArray = dvg.createFlatTaskArray(taskList);

    expect(flatArray.length).toBe(0);
  });

  test('adds keys to tasks and subtasks', () => {
    let taskList = dvMocks.newTaskList();

    let t1 = dvMocks.addTaskTo(taskList);
    let s1 = dvMocks.addSubTaskTo(t1);

    let flatArray = dvg.createFlatTaskArray(taskList);

    expect(t1.key).toBe(dvg.taskKey(t1));
    expect(s1.key).toBe(dvg.taskKey(s1));

  });

});

describe('propagateProperties()', () => {
  test('parent is set', () => {
    let taskList = dvMocks.newTaskList();

    let t1 = dvMocks.addTaskTo(taskList);
    t1.key = "t1";
    let s1 = dvMocks.addSubTaskTo(t1);
    s1.key = "s1";

    dvg.propagateProperties(taskList);

    expect(s1.parent.key).toBe("t1");

  });

  test("predecessorLinks is set", () => {
    let taskList = dvMocks.newTaskList();

    let t1 = dvMocks.addTaskTo(taskList);
    t1.key = "t1";
    t1.predecessors = ["t2", "t3"];
    let t2 = dvMocks.addTaskTo(taskList);
    t2.key = "t2";
    let t3 = dvMocks.addTaskTo(taskList);
    t3.key = "t3";

    dvg.propagateProperties(taskList);

    expect(t1.predecessorLinks.length).toBe(2);
    expect(t1.predecessorLinks.map(e => e.key).includes("t2")).toBe(true);
    expect(t1.predecessorLinks.map(e => e.key).includes("t3")).toBe(true);
  });

  describe("due dates", () => {
    test("Date's are converted to moments", () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.due = new Date("2022-02-10T15:00:00");
      let s1 = dvMocks.addSubTaskTo(t1);
      s1.due = new Date('1995-12-17T03:24:00');
      let s11 = dvMocks.addSubTaskTo(s1);
      s11.due = new Date('1993-12-17T00:00:00'); //Date().parse() has weird timezone rules, so need to use this format
      let s12 = dvMocks.addSubTaskTo(s1);

      dvg.propagateProperties(taskList);

      expect(t1.due.format()).toBe(moment("2022-02-10 15").format());
      expect(s1.due.format()).toBe(moment("1995-12-17 03:24").format());
      expect(s11.due.format()).toBe(moment("1993-12-17").format());
      expect(s12.due.format()).toBe(moment("1995-12-17 03:24").format());
    });

    test("luxon DateTime's are converted to moments", () => {
      // obsidian-dataview parses dates into luxon DateTime's
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.due = DateTime.fromISO("2022-02-10T15:00:00");
      let s1 = dvMocks.addSubTaskTo(t1);
      s1.due = DateTime.fromISO('1995-12-17T03:24:00');
      let s11 = dvMocks.addSubTaskTo(s1);
      s11.due = DateTime.fromISO('1993-12-17T00:00:00'); //Date().parse() has weird timezone rules, so need to use this format
      let s12 = dvMocks.addSubTaskTo(s1);

      dvg.propagateProperties(taskList);

      expect(t1.due.format()).toBe(moment("2022-02-10 15").format());
      expect(s1.due.format()).toBe(moment("1995-12-17 03:24").format());
      expect(s11.due.format()).toBe(moment("1993-12-17").format());
      expect(s12.due.format()).toBe(moment("1995-12-17 03:24").format());

    });

    test("due dates propagate down", () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.due = moment("2022-02-16 15");
      let s1 = dvMocks.addSubTaskTo(t1);
      let s11 = dvMocks.addSubTaskTo(s1);
      let s12 = dvMocks.addSubTaskTo(s1);

      dvg.propagateProperties(taskList);

      expect(t1.due.format()).toBe(moment("2022-02-16 15").format());
      expect(s1.due.format()).toBe(moment("2022-02-16 15").format());
      expect(s11.due.format()).toBe(moment("2022-02-16 15").format());
      expect(s12.due.format()).toBe(moment("2022-02-16 15").format());
    });

    test("parent due dates DO override later subtask due dates", () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.due = moment("2022-02-16 15");
      let s1 = dvMocks.addSubTaskTo(t1);
      let s11 = dvMocks.addSubTaskTo(s1);
      s11.due = moment("2022-03-15 12");
      let s12 = dvMocks.addSubTaskTo(s1);

      dvg.propagateProperties(taskList);

      expect(t1.due.format()).toBe(moment("2022-02-16 15").format());
      expect(s1.due.format()).toBe(moment("2022-02-16 15").format());
      expect(s11.due.format()).toBe(moment("2022-02-16 15").format());
      expect(s12.due.format()).toBe(moment("2022-02-16 15").format());

    });

    test("parent due dates do not override earlier subtask due dates", () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.due = moment("2022-02-16 15");
      let s1 = dvMocks.addSubTaskTo(t1);
      let s11 = dvMocks.addSubTaskTo(s1);
      s11.due = moment("2022-02-15 12");
      let s12 = dvMocks.addSubTaskTo(s1);

      dvg.propagateProperties(taskList);

      expect(t1.due.format()).toBe(moment("2022-02-16 15").format());
      expect(s1.due.format()).toBe(moment("2022-02-16 15").format());
      expect(s11.due.format()).toBe(moment("2022-02-15 12").format());
      expect(s12.due.format()).toBe(moment("2022-02-16 15").format());
    });

  });

  describe("priorities", () => {
    test("priorities propagate down to subtasks", () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.priority = 50;
      let s1 = dvMocks.addSubTaskTo(t1);
      let s11 = dvMocks.addSubTaskTo(s1);
      let s12 = dvMocks.addSubTaskTo(s1);

      dvg.propagateProperties(taskList);

      expect(t1.priority).toBe(50);
      expect(s1.priority).toBe(50);
      expect(s11.priority).toBe(50);
      expect(s12.priority).toBe(50);
    });

    test("parent priorities DO replace lower priority children", () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.priority = 50;
      let s1 = dvMocks.addSubTaskTo(t1);
      let s11 = dvMocks.addSubTaskTo(s1);
      s11.priority = 25;
      let s12 = dvMocks.addSubTaskTo(s1);

      dvg.propagateProperties(taskList);

      expect(t1.priority).toBe(50);
      expect(s1.priority).toBe(50);
      expect(s11.priority).toBe(50);
      expect(s12.priority).toBe(50);

    });

    test("parent priorities don't replace higher priority children", () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.priority = 50;
      let s1 = dvMocks.addSubTaskTo(t1);
      let s11 = dvMocks.addSubTaskTo(s1);
      s11.priority = 75;
      let s12 = dvMocks.addSubTaskTo(s1);

      dvg.propagateProperties(taskList);

      expect(t1.priority).toBe(50);
      expect(s1.priority).toBe(50);
      expect(s11.priority).toBe(75);
      expect(s12.priority).toBe(50);

    });

  });

});

describe('calculateUrgency()', () => {
  describe('by due date', () => {

    test('fullyCompleted tasks get -1', () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.completed = true;

      dvMocks.markFullyCompleted(taskList);

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBe(-1);
    });

    test('more than 7 days overdue gets 12', () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      // set to today - y
      t1.due = moment().subtract(7, 'd');

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBe(12);
    });

    test('7 + 15 = 22 days overdue gets a 13', () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      // set to today - y
      t1.due = moment().subtract(22, 'd');

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBe(13);

    });

    test('due in more than 14 days gets a 0.2', () => {

      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      // set to today - y
      t1.due = moment().add(15, 'd');

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBe(0.2);

    });

    test('overdue by 6 days gets a 11.1 roughly', () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.due = moment().subtract(6, 'd');

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBeCloseTo(11.1, 1);

    });

    test('due today gets a 5.5 roughly', () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.due = moment();

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBeCloseTo(5.5, 1);
    });

    test('due tomorrow gets a 4.8 roughly', () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.due = moment().add(1, 'd');

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBeCloseTo(4.8, 1);
    });


    test('due in 11 days gets a 0.4 roughly', () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.due = moment().add(11, 'd');

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBeCloseTo(0.44, 1);
    });

    test('due in 14 days gets a 0.2', () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.due = moment().add(14, 'd');

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBeCloseTo(0.2, 1);
    });

  });

  describe('by priority', () => {

    test('priority of 100 gets an 8', () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.priority = 100;

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBeCloseTo(8.0, 1);

    });

    test('priority 50 gets a 5.66 roughly', () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.priority = 50;

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBeCloseTo(5.66, 1);
    });

    test('priority 0 gets a 0', () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.priority = 0;

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBe(0);

    });

    test('negative priority gets its value * 8 / 100', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      let t2 = dvMocks.addTaskTo(taskList);
      t1.priority = -8;
      t2.priority = -90;
      dvg.calculateUrgency(taskList);
      expect(t1.urgency).toBeCloseTo(-0.64, 1);
      expect(t2.urgency).toBeCloseTo(-7.2, 1);

    });

  });

  describe('of multiple things', () => {

    test('both due date and priority added together', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      let t2 = dvMocks.addTaskTo(taskList);
      let t3 = dvMocks.addTaskTo(taskList);
      t1.priority = 27;
      t2.due = moment().subtract(3, 'd');

      t3.priority = 27;
      t3.due = moment().subtract(3, 'd');

      dvg.calculateUrgency(taskList);

      expect(t3.urgency).toBe(t1.urgency + t2.urgency);

    });

  });

  describe('propagates through tree', () => {
    test('urgency is calculated for all task depth and breadth', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      t1.priority = 100;
      let s1 = dvMocks.addSubTaskTo(t1);
      s1.priority = 50; // 5.66
      let s11 = dvMocks.addSubTaskTo(s1);
      s11.priority = 100;
      let s12 = dvMocks.addSubTaskTo(s1);
      s12.priority = 50;

      let t2 = dvMocks.addTaskTo(taskList);
      t2.priority = 100;
      let s2 = dvMocks.addSubTaskTo(t2);
      s2.priority = 50; // 5.66
      let s21 = dvMocks.addSubTaskTo(s2);
      s21.priority = 100;

      let t3 = dvMocks.addTaskTo(taskList);
      t3.priority = 100;
      let s3 = dvMocks.addSubTaskTo(t3);
      s3.priority = 50; // 5.66
      let s31 = dvMocks.addSubTaskTo(s3);
      s31.priority = 100;

      dvg.calculateUrgency(taskList);

      expect(t1.urgency).toBeCloseTo(8, 1);
      expect(s1.urgency).toBeCloseTo(5.66, 1);
      expect(s11.urgency).toBeCloseTo(8, 1);
      expect(s12.urgency).toBeCloseTo(5.66, 1);

      expect(t2.urgency).toBeCloseTo(8, 1);
      expect(s2.urgency).toBeCloseTo(5.66, 1);
      expect(s21.urgency).toBeCloseTo(8, 1);

      expect(t3.urgency).toBeCloseTo(8, 1);
      expect(s3.urgency).toBeCloseTo(5.66, 1);
      expect(s31.urgency).toBeCloseTo(8, 1);
    });
  });

});

describe("stripAnnotationsFromString()", () => {
  test("single annotation is stripped", () => {
    let t = "Submit [owner::big boi]";

    let result = dvg.stripAnnotationsFromString(t);
    expect(result).toBe("Submit");
  });

  test("annotation with contained [[wiki-link]] is stripped", () => {
    let t = "Submit [owner::[[big boi]]]";

    let result = dvg.stripAnnotationsFromString(t);
    expect(result).toBe("Submit");
  });

  test("[[wiki-link]] outside of annotation is not removed", () => {
    let t = "[[Submit]] [[link]] [anno:: tation]";

    let result = dvg.stripAnnotationsFromString(t);
    expect(result).toBe("[[Submit]] [[link]]");
  });

  test("strips multiple annotations in same string", () => {
    let t = "Submit [owner::[[big boi]]] [test::text][nn::dlskjfsaf]";

    let result = dvg.stripAnnotationsFromString(t);
    expect(result).toBe("Submit");
  });

});

describe('stripAnnotationsFromTaskList()', () => {
  test('propagates depth and breadth', () => {
    let taskList = dvMocks.newTaskList();
    let t1 = dvMocks.addTaskTo(taskList);
    t1.text = "Submit1 [this:: annotate]";
    let s1 = dvMocks.addSubTaskTo(t1);
    s1.text = "Submit2 [this:: annotate]";
    let s11 = dvMocks.addSubTaskTo(s1);
    s11.text = "Submit3 [this:: annotate]";
    let s12 = dvMocks.addSubTaskTo(s1);
    s12.text = "Submit4 [this:: annotate]";

    let t2 = dvMocks.addTaskTo(taskList);
    t2.text = "Submit5 [this:: annotate]";
    let s2 = dvMocks.addSubTaskTo(t2);
    s2.text = "Submit1 sadfkjl [this:: annotate]";
    let s21 = dvMocks.addSubTaskTo(s2);
    s21.text = "Submit1 [this:: annotate] [kjdfs::dklfjl]";

    let t3 = dvMocks.addTaskTo(taskList);
    t3.text = "Submit2 [this:: annotate]";
    let s3 = dvMocks.addSubTaskTo(t3);
    s3.text = "Submit20 [this:: annotate]";
    let s31 = dvMocks.addSubTaskTo(s3);
    s31.text = "Submit100 [this:: annotate]";

    dvg.stripAnnotationsFromTaskList(taskList);

    expect(t1.text).toBe("Submit1");
    expect(s1.text).toBe("Submit2");
    expect(s11.text).toBe("Submit3");
    expect(s12.text).toBe("Submit4");

    expect(t2.text).toBe("Submit5");
    expect(s2.text).toBe("Submit1 sadfkjl");
    expect(s21.text).toBe("Submit1");

    expect(t3.text).toBe("Submit2");
    expect(s3.text).toBe("Submit20");
    expect(s31.text).toBe("Submit100");
  });
});

describe('nextWorkTime()', () => {
  test('weekend time results in next Monday 1pm', () => {
    // Saturday 2/5/2022 1pm
    // Monday 2/7/2022 1pm
    let m = moment('2022-02-05 13');
    let result = dvg.nextWorkTime(m);
    expect(result.diff(moment('2022-02-07 13'), 'hours')).toBeCloseTo(0, 2);

  });

  test('friday after 5pm results in next Monday 1pm', () => {
    // Friday 2/4/2022 5:05pm
    // Monday 2/7/2022 1pm
    let m = moment('2022-02-04 17');
    let result = dvg.nextWorkTime(m);
    expect(result.diff(moment('2022-02-07 13'), 'hours')).toBeCloseTo(0, 2);
  });

  test('monday between 1-5pm is unchanged', () => {
    // Monday 2/7/2022 2pm
    let m = moment('2022-02-07 14:05');
    let result = dvg.nextWorkTime(m);
    expect(result.diff(moment('2022-02-07 14:05'), 'hours')).toBeCloseTo(0, 2);
  });

  test('friday between 1-5pm is unchanged', () => {
    // Friday 2/4/2022 2pm
    let m = moment('2022-02-04 14:05');
    let result = dvg.nextWorkTime(m);
    expect(result.diff(moment('2022-02-04 14:05'), 'hours')).toBeCloseTo(0, 2);

  })

  test('tuesday 5pm results in weds 1pm', () => {
    // Tues 2/8/2022 5:05pm
    // Weds 2/9/2022 1pm
    let m = moment('2022-02-08 17');
    let result = dvg.nextWorkTime(m);
    expect(result.diff(moment('2022-02-09 13'), 'hours')).toBeCloseTo(0, 2);
  });

  test('weekday before 1pm results in 1pm', () => {
    // Friday 2/4/2022 2pm
    let m = moment('2022-02-04 8:05');
    let result = dvg.nextWorkTime(m);
    expect(result.diff(moment('2022-02-04 13'), 'hours')).toBeCloseTo(0, 2);

    // Monday 2/7/2022 2pm
    let m2 = moment('2022-02-07 1:05');
    let result2 = dvg.nextWorkTime(m2);
    expect(result2.diff(moment('2022-02-07 13'), 'hours')).toBeCloseTo(0, 2);
  });

  test("weekend off-hour times (eg 2:39) result in Monday 1pm sharp", () => {
    // Friday 2/4/2022 2pm
    let m = moment('2022-02-06 18:41:29');
    let result = dvg.nextWorkTime(m);
    expect(result.format()).toBe(moment("2022-02-07 13").format());
  });

});

describe("scheduleTasks()", () => {
  describe("start of schedule", () => {
    test('setting the start of the schedule to Monday 12am results in first task scheduled Monday 1pm', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      let expectedStart = moment("2022-02-07 13");
      let hourDiff = t1.etaStart.diff(expectedStart, 'hours');

      expect(hourDiff).toBeCloseTo(0, 2);

    });

  });

  describe('order of scheduling', () => {
    test('tasks with no owner or predecessors are schedule at schedule start', () => {

      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      let t2 = dvMocks.addTaskTo(taskList);

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(t1.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(t2.etaStart.format()).toBe(moment('2022-02-07 13').format());

    });

    test('two tasks with same owner are scheduled consecutively', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      t1.duration = moment.duration(1, 'h');
      t1.owner = "Owner";
      t1.priority = 100;
      let t2 = dvMocks.addTaskTo(taskList);
      t2.duration = moment.duration(1, 'h');
      t2.owner = "Owner";
      t2.priority = 0;

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(t1.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(t2.etaStart.format()).toBe(moment('2022-02-07 14').format());

    });

    test('two tasks with same owner are scheduled correctly (reversed)', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      t1.duration = moment.duration(1, 'h');
      t1.owner = "Owner";
      t1.priority = 0;
      let t2 = dvMocks.addTaskTo(taskList);
      t2.duration = moment.duration(1, 'h');
      t2.owner = "Owner";
      t2.priority = 100;

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(t1.etaStart.format()).toBe(moment('2022-02-07 14').format());
      expect(t2.etaStart.format()).toBe(moment('2022-02-07 13').format());
    });

    test('two subtasks with the same owner are scheduled correctly', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      let s1 = dvMocks.addSubTaskTo(t1);
      s1.duration = moment.duration(1, 'h');
      s1.owner = "Owner";
      s1.priority = 100;
      let s2 = dvMocks.addSubTaskTo(t1);
      s2.duration = moment.duration(1, 'h');
      s2.owner = "Owner";
      s2.priority = 0;

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(s1.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(s2.etaStart.format()).toBe(moment('2022-02-07 14').format());

    });

    test('two subtasks (reverse order) with the same owner are scheduled correctly', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      let s1 = dvMocks.addSubTaskTo(t1);
      s1.duration = moment.duration(1, 'h');
      s1.owner = "Owner";
      s1.priority = 0;
      let s2 = dvMocks.addSubTaskTo(t1);
      s2.duration = moment.duration(1, 'h');
      s2.owner = "Owner";
      s2.priority = 100;

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(s1.etaStart.format()).toBe(moment('2022-02-07 14').format());
      expect(s2.etaStart.format()).toBe(moment('2022-02-07 13').format());

    });

    test('three tasks with same owner are scheduled correctly', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      t1.duration = moment.duration(1, 'h');
      t1.owner = "Owner";
      t1.priority = 0;
      let t2 = dvMocks.addTaskTo(taskList);
      t2.duration = moment.duration(0.5, 'h');
      t2.owner = "Owner";
      t2.priority = 50;
      let t3 = dvMocks.addTaskTo(taskList);
      t3.duration = moment.duration(0.25, 'h');
      t3.owner = "Owner";
      t3.priority = 25;

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(t1.etaStart.format()).toBe(moment('2022-02-07 13:45').format());
      expect(t2.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(t3.etaStart.format()).toBe(moment('2022-02-07 13:30').format());
    });

    test('multiple owners scheduled separately', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      t1.duration = moment.duration(1, 'h');
      t1.owner = "Owner";
      t1.priority = 0;
      let t2 = dvMocks.addTaskTo(taskList);
      t2.duration = moment.duration(1, 'h');
      t2.owner = "Owner";
      t2.priority = 50;
      let t3 = dvMocks.addTaskTo(taskList);
      t3.duration = moment.duration(1, 'h');
      t3.owner = "Loner";
      t3.priority = 25;
      let t4 = dvMocks.addTaskTo(taskList);
      t4.duration = moment.duration(1, 'h');
      t4.owner = "Loner";
      t4.priority = 0;

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(t1.etaStart.format()).toBe(moment('2022-02-07 14').format());
      expect(t2.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(t3.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(t4.etaStart.format()).toBe(moment('2022-02-07 14').format());
    });

    test('predecessors in leafs are scheduled first', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      t1.duration = moment.duration(1, 'h');
      t1.key = "hi";
      let t2 = dvMocks.addTaskTo(taskList);
      t2.duration = moment.duration(1, 'h');
      t2.predecessors = ["hi"];

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(t1.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(t2.etaStart.format()).toBe(moment('2022-02-07 14').format());
    });

    test('multiple predecessors in leafs are scheduled first', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      t1.duration = moment.duration(1, 'h');
      t1.key = "hi";
      let t2 = dvMocks.addTaskTo(taskList);
      t2.duration = moment.duration(1, 'h');
      t2.key = "bye"
      t2.predecessors = ["hi"];
      let t3 = dvMocks.addTaskTo(taskList);
      t3.duration = moment.duration(1, 'h');
      t3.predecessors = ["hi", "bye"];

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(t1.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(t2.etaStart.format()).toBe(moment('2022-02-07 14').format());
      expect(t3.etaStart.format()).toBe(moment('2022-02-07 15').format());
    });

    test('multiple predecessors in leafs are scheduled first, even when added out of order', () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      t1.duration = moment.duration(1, 'h');
      t1.predecessors = ["hi", "bye"];
      let t2 = dvMocks.addTaskTo(taskList);
      t2.duration = moment.duration(1, 'h');
      t2.key = "bye"
      t2.predecessors = ["hi"];
      let t3 = dvMocks.addTaskTo(taskList);
      t3.duration = moment.duration(1, 'h');
      t3.key = "hi";

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(t1.etaStart.format()).toBe(moment('2022-02-07 15').format());
      expect(t2.etaStart.format()).toBe(moment('2022-02-07 14').format());
      expect(t3.etaStart.format()).toBe(moment('2022-02-07 13').format());
    });

    test("owner's highest priority task having long predecessors does not prevent owner from doing work in the meantime", () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      t1.duration = moment.duration(1, 'h');
      t1.owner = "Owner";
      t1.predecessors = ["long"];
      let t2 = dvMocks.addTaskTo(taskList);
      t2.duration = moment.duration(1, 'h');
      t2.owner = "Owner";
      let t3 = dvMocks.addTaskTo(taskList);
      t3.duration = moment.duration(3, 'h');
      t3.key = "long";
      t3.priority = 100;

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(t1.etaStart.format()).toBe(moment('2022-02-07 16').format());
      expect(t3.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(t2.etaStart.format()).toBe(moment('2022-02-07 13').format());

    });

    test("parent task start times are set to earliest child etaStart", () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      let s1 = dvMocks.addSubTaskTo(t1);
      s1.owner = "Owner";
      s1.duration = moment.duration(1, 'h');
      s1.priority = 100;
      let s2 = dvMocks.addSubTaskTo(t1);
      s2.owner = "Owner";
      s2.duration = moment.duration(1, 'h');
      s2.priority = 10;
      let s3 = dvMocks.addSubTaskTo(t1);
      s3.owner = "Owner";
      s3.duration = moment.duration(30, 'm');
      s3.priority = 0;

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(t1.eta.format()).toBe(moment('2022-02-07 15:30').format());
      expect(t1.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(t1.duration.asHours()).toBe(2.5);
    });

    describe("parallel tag", () => {
      test("parallel=true tag allows for overlap from same owner", () => {
        let taskList = dvMocks.newTaskList();
        let t1 = dvMocks.addTaskTo(taskList);
        t1.owner = "Owner";
        t1.priority = 100;
        t1.parallel = true;
        t1.duration = moment.duration(2, 'h');
        let t2 = dvMocks.addTaskTo(taskList);
        t2.owner = "Owner";
        t2.priority = 50;
        t2.duration = moment.duration(1, 'h');
        let t3 = dvMocks.addTaskTo(taskList);
        t3.owner = "Owner";
        t3.priority = 25
        t3.duration = moment.duration(1, 'h');

        let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

        expect(t1.etaStart.format()).toBe(moment('2022-02-07 13').format());
        expect(t2.etaStart.format()).toBe(moment('2022-02-07 13').format());
        expect(t3.etaStart.format()).toBe(moment('2022-02-07 14').format());
      });

      test("parallel-true tag is scheduled after predecessors", () => {
        let taskList = dvMocks.newTaskList();
        let t1 = dvMocks.addTaskTo(taskList);
        t1.owner = "Owner";
        t1.key = "t1";
        t1.priority = 100;
        t1.parallel = true;
        t1.duration = moment.duration(2, 'h');
        t1.predecessors = ["t2"];
        let t2 = dvMocks.addTaskTo(taskList);
        t2.owner = "Owner";
        t2.key = "t2";
        t2.priority = 50;
        t2.duration = moment.duration(1, 'h');
        let t3 = dvMocks.addTaskTo(taskList);
        t3.owner = "Owner";
        t3.priority = 25
        t3.duration = moment.duration(1, 'h');

        let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

        expect(t1.etaStart.format()).toBe(moment('2022-02-07 14').format());
        expect(t2.etaStart.format()).toBe(moment('2022-02-07 13').format());
        expect(t3.etaStart.format()).toBe(moment('2022-02-07 14').format());
      });

      // TODO parallel tag works with manual tag
      test("parallel-true tag works when manual-true is also set", () => {
        let taskList = dvMocks.newTaskList();
        let t1 = dvMocks.addTaskTo(taskList);
        t1.owner = "Owner";
        t1.priority = 100;
        t1.parallel = true;
        t1.manual = true;
        t1.start = moment("2022-02-07 14");
        t1.duration = moment.duration(2, 'h');
        let t2 = dvMocks.addTaskTo(taskList);
        t2.owner = "Owner";
        t2.priority = 50;
        t2.duration = moment.duration(1, 'h');
        let t3 = dvMocks.addTaskTo(taskList);
        t3.owner = "Owner";
        t3.priority = 25
        t3.duration = moment.duration(1, 'h');

        let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

        expect(t1.etaStart.format()).toBe(moment('2022-02-07 14').format());
        expect(t2.etaStart.format()).toBe(moment('2022-02-07 13').format());
        expect(t3.etaStart.format()).toBe(moment('2022-02-07 14').format());
      });

    });

    describe('manual tag', () => {
      test("manual tag in parent overrides auto scheduling of parent eta's", () => {
        let taskList = dvMocks.newTaskList();
        let t1 = dvMocks.addTaskTo(taskList);
        t1.manual = true;
        t1.start = moment("2022-02-01");
        t1.eta = moment("2022-03-05");
        let s1 = dvMocks.addSubTaskTo(t1);
        s1.owner = "Owner";
        s1.duration = moment.duration(1, 'h');
        s1.priority = 100;
        let s2 = dvMocks.addSubTaskTo(t1);
        s2.owner = "Owner";
        s2.duration = moment.duration(1, 'h');
        s2.priority = 10;
        let s3 = dvMocks.addSubTaskTo(t1);
        s3.owner = "Owner";
        s3.duration = moment.duration(30, 'm');
        s3.priority = 0;

        let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

        expect(t1.eta.format()).toBe(moment('2022-03-05').format());
        expect(t1.etaStart.format()).toBe(moment('2022-02-01').format());

        expect(s1.etaStart.format()).toBe(moment('2022-02-07 13').format());
        expect(s2.etaStart.format()).toBe(moment('2022-02-07 14').format());
        expect(s3.etaStart.format()).toBe(moment('2022-02-07 15').format());

      });

      test("manual tag in leaf task influences scheduling of subsequent tasks", () => {
        let taskList = dvMocks.newTaskList();
        let t1 = dvMocks.addTaskTo(taskList);
        let s1 = dvMocks.addSubTaskTo(t1);
        s1.owner = "Owner";
        s1.duration = moment.duration(1, 'h');
        s1.priority = 0;
        s1.due = moment("2022-04-01");
        let s2 = dvMocks.addSubTaskTo(t1);
        s2.owner = "Owner";
        s2.duration = moment.duration(1, 'h');
        s2.priority = 100;
        let s3 = dvMocks.addSubTaskTo(t1);
        s3.owner = "Owner";
        s3.manual = true;
        s3.start = moment("2022-02-07 14");
        s3.eta = moment("2022-03-07"); //2022-03-07 = Monday
        s3.priority = 50;

        let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

        expect(s3.etaStart.format()).toBe(moment('2022-02-07 14').format());
        expect(s3.eta.format()).toBe(moment('2022-03-07').format());

        expect(s2.etaStart.format()).toBe(moment('2022-02-07 13').format());
        expect(s1.etaStart.format()).toBe(moment('2022-03-07 13').format());
        expect(s1.eta.format()).toBe(moment('2022-03-07 14').format());

        expect(t1.eta.format()).toBe(moment('2022-03-07 14').format());
        expect(t1.etaStart.format()).toBe(moment('2022-02-07 13').format());

      });

      test("manual tag works on a predecessor with a different owner", () => {
        let taskList = dvMocks.newTaskList();
        let t1 = dvMocks.addTaskTo(taskList);
        let s1 = dvMocks.addSubTaskTo(t1);
        s1.owner = "Owner";
        s1.duration = moment.duration(1, 'h');
        s1.priority = 0;
        s1.due = moment("2022-04-01");
        let s2 = dvMocks.addSubTaskTo(t1);
        s2.owner = "Owner";
        s2.duration = moment.duration(1, 'h');
        s2.priority = 100;
        s2.predecessors = ["s3"];
        let s3 = dvMocks.addSubTaskTo(t1);
        s3.owner = "Owner2";
        s3.manual = true;
        s3.key = "s3";
        s3.created = moment("2022-02-18");
        s3.eta = moment("2022-02-23"); //2022-03-07 = Monday

        let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-19 00") }) // Saturday

        expect(s3.etaStart.format()).toBe(moment('2022-02-18').format());
        expect(s3.eta.format()).toBe(moment('2022-02-23').format());

        expect(s2.etaStart.format()).toBe(moment('2022-02-23 13').format());
        expect(s2.eta.format()).toBe(moment('2022-02-23 14').format());

        expect(s1.etaStart.format()).toBe(moment('2022-02-21 13').format());
        expect(s1.eta.format()).toBe(moment('2022-02-21 14').format());

        expect(t1.eta.format()).toBe(moment('2022-02-23 14').format());
        expect(t1.etaStart.format()).toBe(moment('2022-02-18').format());

      });

    });

    describe('error checking', () => {
      test("predecessor loops throw an error", () => {
        let taskList = dvMocks.newTaskList();
        let t1 = dvMocks.addTaskTo(taskList);
        t1.key = "t1";
        t1.predecessors = ["t2"];
        let t2 = dvMocks.addTaskTo(taskList);
        t2.key = "t2";
        t2.predecessors = ["t3"];
        let t3 = dvMocks.addTaskTo(taskList);
        t3.key = "t3";
        t3.predecessors = ["t1"];

        expect(() => {
          let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })
        }).toThrow(Error);
      });

      test("duplicate keys throws an error", () => {
        let taskList = dvMocks.newTaskList();
        let t1 = dvMocks.addTaskTo(taskList);
        t1.key = "long";
        let t2 = dvMocks.addTaskTo(taskList);
        t2.key = "long";

        expect(() => {
          let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })
        }).toThrow(Error);


      });



    })

    test("one owner's subtasks from different parents do not overlap", () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      let s11 = dvMocks.addSubTaskTo(t1);
      s11.owner = "Owner";
      s11.duration = moment.duration(1, 'h');
      s11.priority = 25;
      let s12 = dvMocks.addSubTaskTo(t1);
      s12.owner = "Owner";
      s12.duration = moment.duration(1, 'h');
      s12.priority = 75;

      let t2 = dvMocks.addTaskTo(taskList);
      let s21 = dvMocks.addSubTaskTo(t2);
      s21.owner = "Owner";
      s21.duration = moment.duration(1, 'h');
      s21.priority = 100;
      let s22 = dvMocks.addSubTaskTo(t2);
      s22.owner = "Owner";
      s22.duration = moment.duration(1, 'h');
      s22.priority = 50;

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-06 16:33:21") })

      expect(s11.etaStart.format()).toBe(moment('2022-02-07 16').format());
      expect(s12.etaStart.format()).toBe(moment('2022-02-07 14').format());
      expect(s21.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(s22.etaStart.format()).toBe(moment('2022-02-07 15').format());

    });

    test('completed tasks are not scheduled', () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      let s11 = dvMocks.addSubTaskTo(t1);
      s11.owner = "Owner";
      s11.duration = moment.duration(1, 'h');
      s11.priority = 25;
      let s12 = dvMocks.addSubTaskTo(t1);
      s12.owner = "Owner";
      s12.duration = moment.duration(1, 'h');
      s12.priority = 75;
      s12.completed = true;

      let t2 = dvMocks.addTaskTo(taskList);
      let s21 = dvMocks.addSubTaskTo(t2);
      s21.owner = "Owner";
      s21.duration = moment.duration(1, 'h');
      s21.priority = 100;
      s21.completed = true;
      s21.completion = moment("2022-01-01 12:33");
      let s22 = dvMocks.addSubTaskTo(t2);
      s22.owner = "Owner";
      s22.duration = moment.duration(1, 'h');
      s22.priority = 50;

      //make sure to mark the fullyCompleted
      dvMocks.markFullyCompleted(taskList);

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-06 16:33:21") })

      expect(s22.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(s11.etaStart.format()).toBe(moment('2022-02-07 14').format());

      // default eta for completed tasks is the schedule start
      expect(s12.eta.format()).toBe(moment("2022-02-06 16:33:21").format());
      expect(s21.eta.format()).toBe(moment("2022-01-01 12:33").format());

    });

    test("subtasks are scheduled based on their parent's due date", () => {
      let taskList = dvMocks.newTaskList();

      let t1 = dvMocks.addTaskTo(taskList);
      t1.due = moment("2022-03-01"); // due next month, all subtasks should be scheduled later
      let s11 = dvMocks.addSubTaskTo(t1);
      s11.owner = "Owner";
      s11.duration = moment.duration(1, 'h');
      s11.priority = 25;
      let s12 = dvMocks.addSubTaskTo(t1);
      s12.owner = "Owner";
      s12.duration = moment.duration(1, 'h');
      s12.priority = 50;

      let t2 = dvMocks.addTaskTo(taskList);
      t2.due = moment("2022-02-01");
      let s21 = dvMocks.addSubTaskTo(t2);
      s21.owner = "Owner";
      s21.duration = moment.duration(1, 'h');
      s21.priority = 10;
      s21.completion = moment("2022-01-01 12:33");
      let s22 = dvMocks.addSubTaskTo(t2);
      s22.owner = "Owner";
      s22.duration = moment.duration(1, 'h');
      s22.priority = 5;

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-06 16:33:21") })


      expect(s21.etaStart.format()).toBe(moment('2022-02-07 13').format());
      expect(s22.etaStart.format()).toBe(moment('2022-02-07 14').format());
      expect(s12.etaStart.format()).toBe(moment('2022-02-07 15').format());
      expect(s11.etaStart.format()).toBe(moment('2022-02-07 16').format());

    });

  });

  describe("annotations and properties", () => {
    test("annotations are removed and replaced with defaults", () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      let s1 = dvMocks.addSubTaskTo(t1);
      s1.owner = "Owner";
      s1.duration = moment.duration(1, 'h');
      s1.due = moment("2022-04-01");
      let s2 = dvMocks.addSubTaskTo(t1);
      s2.owner = "Owner";
      s2.duration = moment.duration(1, 'h');
      s2.priority = 100;
      let s3 = dvMocks.addSubTaskTo(t1);
      s3.owner = "Owner";
      s3.manual = true;
      s3.start = moment("2022-02-07 14");
      s3.eta = moment("2022-03-07"); //2022-03-07 = Monday
      s3.priority = 50;

      s1.text = "Test1 [tag::1] [taggy::Hello]"
      s2.text = "Testing2 [blah::dkljsdfk] [xxxx::99]";
      s3.text = "test test [jkdkf::lksdfljk]";

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })


      expect(s1.eta.format()).toBe(moment('2022-03-07 14').format());
      expect(s1.text).toBe("Test1 [due::2022-04-01] [eta::2022-03-07] [owner::Owner]");

      expect(s2.text).toBe("Testing2 [priority::100] [eta::2022-02-07] [owner::Owner]");
      expect(s3.text).toBe("test test [priority::50] [eta::2022-03-07] [owner::Owner]");
    });

    test("due/overdue tasks highlighted red", () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      t1.duration = moment.duration(2, 'h');
      t1.due = moment("2021-02-22");
      t1.text = "Test Text [jkdfsjk::sdkld]";

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(t1.eta.format()).toBe(moment("2022-02-07 15").format());
      expect(t1.text).toBe('Test Text [due::2021-02-22] [eta::<font color="red"><b>2022-02-07</b></font>]');
    });
  });

  describe("eta propagation", () => {
    test("subtask eta's propagate upward multiple levels", () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);

      let s1 = dvMocks.addSubTaskTo(t1);
      let s11 = dvMocks.addSubTaskTo(s1);
      s11.manual = true;
      s11.eta = moment("2022-02-07 13");
      let s12 = dvMocks.addSubTaskTo(s1);
      s12.manual = true;
      s12.eta = moment("2022-02-07 14");

      let s2 = dvMocks.addSubTaskTo(t1);
      let s21 = dvMocks.addSubTaskTo(s2);
      s21.manual = true;
      s21.eta = moment("2022-02-08 13");
      let s22 = dvMocks.addSubTaskTo(s2);
      s22.manual = true;
      s22.eta = moment("2022-02-09 14");

      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(s22.eta.format()).toBe(moment("2022-02-09 14").format());
      expect(s21.eta.format()).toBe(moment("2022-02-08 13").format());
      expect(s2.eta.format()).toBe(moment("2022-02-09 14").format());

      expect(s12.eta.format()).toBe(moment("2022-02-07 14").format());
      expect(s11.eta.format()).toBe(moment("2022-02-07 13").format());
      expect(s1.eta.format()).toBe(moment("2022-02-07 14").format());

      expect(t1.eta.format()).toBe(moment("2022-02-09 14").format());

    });

    test("subtasks (with priorities etc) eta's propagate upward multiple levels", () => {
      let taskList = dvMocks.newTaskList();
      let t1 = dvMocks.addTaskTo(taskList);
      t1.priority = 50;
      t1.due = moment("2022-02-01");

      let s1 = dvMocks.addSubTaskTo(t1);
      s1.priority = 90;
      let s11 = dvMocks.addSubTaskTo(s1);
      s11.manual = true;
      s11.eta = moment("2022-02-07 13");
      let s12 = dvMocks.addSubTaskTo(s1);
      s12.manual = true;
      s12.eta = moment("2022-02-07 14");
      s12.owner = "Owner";
      s12.completed = true;
      let s13 = dvMocks.addSubTaskTo(s1);
      s13.owner = "Owner";
      s13.duration = moment.duration(2, 'h');

      let s2 = dvMocks.addSubTaskTo(t1);
      let s21 = dvMocks.addSubTaskTo(s2);
      s21.manual = true;
      s21.eta = moment("2022-02-08 13");
      s21.completed = true;
      let s22 = dvMocks.addSubTaskTo(s2);
      s22.manual = true;
      s22.eta = moment("2022-02-09 14");
      s22.key = "s22";
      let s23 = dvMocks.addSubTaskTo(s2);
      s23.predecessors = ["s22"];
      s23.duration = moment.duration(2, 'h')

      dvMocks.markFullyCompleted(taskList);
      let schedule = dvg.scheduleTasks(taskList, { scheduleStart: moment("2022-02-07 00") })

      expect(s23.eta.format()).toBe(moment("2022-02-09 16").format());
      expect(s22.eta.format()).toBe(moment("2022-02-09 14").format());
      expect(s21.eta.format()).toBe(moment("2022-02-08 13").format());
      expect(s2.eta.format()).toBe(moment("2022-02-09 16").format());

      expect(s13.eta.format()).toBe(moment("2022-02-07 15").format());
      expect(s12.eta.format()).toBe(moment("2022-02-07 14").format());
      expect(s11.eta.format()).toBe(moment("2022-02-07 13").format());
      expect(s1.eta.format()).toBe(moment("2022-02-07 15").format());

      expect(t1.eta.format()).toBe(moment("2022-02-09 16").format());

    });

  });

});


// TODO add test for multiple subtasks layers eta's propagating up to parent
// TODO test that predecessors on parents prevent subtasks from being scheduled before predecessors
    // TODO ensure parent priority influences subtask scheduling
// implement a milestone tag
// implement outputting mermaid gantt charts
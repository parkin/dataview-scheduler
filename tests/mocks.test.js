import * as dvMocks from './mocks';
import { DateTime } from 'luxon';

describe('newTaskList()', () => {

    test('... has values of zero length', () => {
        let nt = dvMocks.newTaskList();
        expect(nt.values.length).toBe(0);
    });
});

describe('addTaskTo()', () => {
    test('increases length of task list', () => {
        let nt = dvMocks.newTaskList();

        dvMocks.addTaskTo(nt)
        expect(nt.values.length).toBe(1);

        dvMocks.addTaskTo(nt)
        expect(nt.values.length).toBe(2);
    });

    test('new task has zero length subtasks.values', () => {
        let nt = dvMocks.newTaskList();

        dvMocks.addTaskTo(nt);
        expect(nt.values[0].subtasks.values.length).toBe(0);

        dvMocks.addTaskTo(nt);
        expect(nt.values[1].subtasks.values.length).toBe(0);
    });

    test('default values', () => {
        let nt = dvMocks.newTaskList();

        dvMocks.addTaskTo(nt);
        expect(nt.values[0].completed).toBe(false);
        expect(nt.values[0].fullyCompleted).toBe(false);
        expect(nt.values[0].path).toBe("Projects/project.md");
        expect(nt.values[0].link.path).toBe("Projects/project.md");
        expect(nt.values[0].created.diff(DateTime.now()).milliseconds).toBeLessThan(500); // should be close to now

        dvMocks.addTaskTo(nt);
        expect(nt.values[1].completed).toBe(false);
        expect(nt.values[1].fullyCompleted).toBe(false);
        expect(nt.values[1].path).toBe("Projects/project.md");
        expect(nt.values[1].link.path).toBe("Projects/project.md");
        expect(nt.values[1].created.diff(DateTime.now()).milliseconds).toBeLessThan(500); // should be close to now
    });

    test('increments the line property of each task', () => {
        let nt = dvMocks.newTaskList();

        dvMocks.addTaskTo(nt);

        dvMocks.addTaskTo(nt);
        expect(nt.values[1].line).toBe(1 + nt.values[0].line);

        dvMocks.addTaskTo(nt);
        expect(nt.values[2].line).toBe(1 + nt.values[1].line);
    });

    test('returns a pointer to the added task', () => {
        let nt = dvMocks.newTaskList();

        let st = dvMocks.addTaskTo(nt);
        expect(nt.values[0].completed).toBe(st.completed);
        expect(nt.values[0].fullyCompleted).toBe(st.fullyCompleted);
        expect(nt.values[0].path).toBe(st.path);

        // check if we modify st, nt is modified as well
        st.completed = true;
        expect(nt.values[0].completed).toBe(true);

    });

    test('properties are passed correctly', () => {
        let nt = dvMocks.newTaskList();

        let task = dvMocks.addTaskTo(nt, { completed: true, path: "hi" });
        expect(task.completed).toBe(true);
        expect(task.path).toBe("hi");
    });
}); //addTask end

describe('addSubTask()', () => {

    test('increments the subtasks.values length', () => {
        let nt = dvMocks.newTaskList();

        let task = dvMocks.addTaskTo(nt);
        expect(task.subtasks.values.length).toBe(0);

        let sub1 = dvMocks.addSubTaskTo(task);
        expect(task.subtasks.values.length).toBe(1);
        expect(sub1.line).toBe(1 + task.line);

        let sub2 = dvMocks.addSubTaskTo(task);
        expect(task.subtasks.values.length).toBe(2);
        expect(sub2.line).toBe(1 + sub1.line);

        //expect top level list to still have 1 item
        expect(nt.values.length).toBe(1);
    });

    test('subtask has zero length subtasks', () => {
        let nt = dvMocks.newTaskList();

        let task = dvMocks.addTaskTo(nt);

        let sub1 = dvMocks.addSubTaskTo(task);

        expect(sub1.subtasks.values.length).toBe(0);

    });


}); // addSubtTask end

describe("markFullyCompleted()", () => {
    test("marks completed leafs as fully completed", () => {
        let taskList = dvMocks.newTaskList();

        let t1 = dvMocks.addTaskTo(taskList);
        t1.completed = true;
        let t2 = dvMocks.addTaskTo(taskList);
        t2.completed = true;

        dvMocks.markFullyCompleted(taskList);

        expect(t1.fullyCompleted).toBe(true);
        expect(t2.fullyCompleted).toBe(true);
    });

    test("marks parents with incomplete subtasks as not fullyCompleted", () => {
        let taskList = dvMocks.newTaskList();

        let t1 = dvMocks.addTaskTo(taskList);
        let s1 = dvMocks.addSubTaskTo(t1);
        s1.completed = true;
        let s2 = dvMocks.addSubTaskTo(t1);
        let s3 = dvMocks.addSubTaskTo(t1);
        s3.completed = true;
        let s4 = dvMocks.addSubTaskTo(t1);
        s4.completed = false;

        dvMocks.markFullyCompleted(taskList);

        expect(t1.fullyCompleted).toBe(false);
    });

    test("marks incomplete parents with all subtasks completed as not fullyCompleted", () => {
        let taskList = dvMocks.newTaskList();

        let t1 = dvMocks.addTaskTo(taskList);
        let s1 = dvMocks.addSubTaskTo(t1);
        s1.completed = true;
        let s2 = dvMocks.addSubTaskTo(t1);
        s2.completed = true;
        let s3 = dvMocks.addSubTaskTo(t1);
        s3.completed = true;
        let s4 = dvMocks.addSubTaskTo(t1);
        s4.completed = true;

        dvMocks.markFullyCompleted(taskList);

        expect(t1.fullyCompleted).toBe(false);
    });

    test("marks completed parents with all subtasks completed as fullyCompleted", () => {
        let taskList = dvMocks.newTaskList();

        let t1 = dvMocks.addTaskTo(taskList);
        t1.complete = true;
        let s1 = dvMocks.addSubTaskTo(t1);
        s1.completed = true;
        let s2 = dvMocks.addSubTaskTo(t1);
        s2.completed = true;
        let s3 = dvMocks.addSubTaskTo(t1);
        s3.completed = true;
        let s4 = dvMocks.addSubTaskTo(t1);
        s4.completed = true;

        dvMocks.markFullyCompleted(taskList);

        expect(t1.fullyCompleted).toBe(false);
    });

});
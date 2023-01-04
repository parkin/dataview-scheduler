
### Open Tasks

Here's an example `dataviewjs` script using the DataView Scheduler.

To use this, in your vault you need to
- create a `/code` directory
- copy the `datagantt.js` file from this repo to your vault's new `/code/` folder
- download `moment.min.js` from [momentjs.com](ttps://momentjs.com/) and copy `moment.min.js` to the `/code/` folder in your vault
- restart Obsidian to pick up these changes

```dataviewjs

const dvg = require(app.vault.adapter.basePath + "/code/datagantt.js");

//*********************** Start processing

// Get the task list
let taskList = dv.pages('"Projects"').file.tasks;


// schedule
dvg.scheduleTasks(taskList);

//console.log(taskList);

let flatTasks = dvg.createFlatTaskArray(taskList);
flatTasks.sort((a,b) => b.urgency - a.urgency);

console.log(flatTasks);

dv.table(
	["Task", "Parent", "Due", "Owner", "Urgency", "EtaStart", "Eta", "Duration"],
	flatTasks
		.filter(b => 'owner' in b && b.owner == "Will") // only Will's tasks
		.filter(b => b.subtasks.length == 0) // only leafs
		.filter(b => !('completed' in b && b.completed)) // only incomplete
		.sort((a,b) => {
			// sort owner == Will to the top
			if(a.owner == "Will" && b.owner != "Will"){
				return -1;
			} else if (a.owner != "Will" && b.owner == "Will") {
				return 1;
			} else if (a.etaStart.isSame(b.etaStart)){
				return b.urgency - a.urgency;
			} else {
				return a.etaStart.diff(b.etaStart, 'seconds');
			}
		})
		.map(b => [
			// Name and add the link
			b.text + '<a href="' + b.link.path +'" class="internal-link" target="_blank" rel="noopener">🔗</a>',
			//Parent
			b.parent == null ? "" : b.parent.text,
			// Due
			b.due == null ? "" : b.due.format("YYYY-MM-DD"),
			// Owner
			b.owner,
			// Urgency
			'urgency' in b ? b.urgency.toFixed(1) : "",
			// ETA start
			'etaStart' in b ? b.etaStart.format("YYYY-MM-DD h:mm a") : "",
			// ETA
			'eta' in b ? b.eta.format("YYYY-MM-DD h:mm a") : "",
			//Duration
			'duration' in b ? b.duration : ""
		])
);


```


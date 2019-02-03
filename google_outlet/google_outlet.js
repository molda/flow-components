exports.id = 'google_outlet';
exports.title = 'Outlet (Google)';
exports.version = '1.0.0';
exports.author = 'Martin Smola';
exports.group = 'Google Devices';
exports.icon = 'plug';
exports.dashboard = true;
exports.flowboard = true;
exports.googlesmarthome = true;
exports.color = '#5CB36D';
exports.input = 2;
exports.output = 1;
exports.click = true;;
exports.options = { nicknames: 'wall plug', reportstate: false, use_status_input: true };
exports.readme = `# Device - Outlet
### Inputs
- #1 -> set (sends data to output)
- #2 -> status feedback (sets new state and updates dashboard and flowboard)

To turn the outlet on/off send an object with 'on' property
- { on: true }

Use the same data as above for status feedback on input #2

### Output
\`\`\`javascript
{
	name: 'Outlet name',
	id: 'xxxxxxx',
	type: 'OUTLET',
	on: true // or false
}
\`\`\`
`;

exports.html = `<div class="padding">
	<p>The label you specify above is the name that will be reported to google along with the Additional names.</p>	
	<div class="row m">
		<div class="col-md-12">
			<div data-jc="textbox__nicknames__placeholder:outlet;required:true" class="m">@(Nicknames) (@(separated by comma))</div>
			<div data-jc="checkbox__use_status_input">@(Use status input)</div>
			<div class="help m">@(If checked the status is set based on the data comming to status input ( input #2).)</div>
			<div data-jc="checkbox__reportstate">@(Report state to Google) (@(optional))</div>
		</div>
	</div>
</div>`;

exports.install = function(instance) {
	// hack to allow googlefullfilment to this
	instance.googlesmarthome = true;

	var device = {
		id: instance.id,
		type: 'action.devices.types.OUTLET',
		traits: [
			'action.devices.traits.OnOff'
		],
		name: {
			defaultNames: ['The Outlet'],
			name: '',
			nicknames: []
		},
		willReportState: false,
		roomHint: 'Living room',
		deviceInfo: {
			manufacturer: 'ThingsHub',
			model: 'Outlet',
			hwVersion: '1.0',
			swVersion: '1.0'
		},
		customData: {
			// fooValue: 74,
			// barValue: true,
			// bazValue: 'foo'
		}
	};

	var state = {
		online: true,
		on: true
	};

	instance.custom.sync = function() {
		return device;
	};

	instance.custom.query = function(customData) {
		device.customData = customData;
		return state;
	};

	instance.custom.exec = function(ex) {
		if (ex.command !== 'action.devices.commands.OnOff')
			return { errorCode: 'hardError', status: 'ERROR' };
		
		if (typeof(ex.params.on) !== 'boolean')
			return { errorCode: 'hardError', status: 'ERROR' };

		state.on = ex.params.on;
		var s = CLONE(state);
		s.status = 'SUCCESS';
		s.states = state;

		send();

		return s;
	};

	var status = () => {
		instance.status('Outlet is: ' + (state.on ? 'On' : 'Off'));
		instance.dashboard('status', { id: device.id, state: state });
		instance.flowboard('status', { id: device.id, state: state });
	}

	function toggle() {		
		state.on = !state.on;
		send();
	}

	function send(){
		instance.send2({ id: device.id, state: state });
		if (!instance.options.use_status_input)
			status();
	}

	function reconfigure(init) {
		var opts = instance.options;

		device.name.name = instance.name;
		device.name.nicknames = (opts.nicknames || '').split(',').trim();
		device.willReportState = opts.reportstate;
		status();

		EMIT('googlefullfilment.requestsync');
	}

	instance.on('dashboard', dashboardflowboard);
	instance.on('flowboard', dashboardflowboard);

	function dashboardflowboard(type) {
		type === 'click' && toggle();
		type === 'status' && status();
	}

	instance.on('0', function(flowdata) {
		if (flowdata.data === 'toggle')
			return toggle();
		state.on = flowdata.data.on;
		send();
	});

	// status feedback
	instance.on('1', function(flowdata) {
		var d = flowdata.data;
		state.on = d.on || false;
		status();
	});

	instance.on('click', toggle);
	instance.on('options', reconfigure);

	reconfigure(true);
};

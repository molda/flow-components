exports.id = 'google_light';
exports.title = 'Light (Google)';
exports.version = '1.0.0';
exports.author = 'Martin Smola';
exports.group = 'Google Devices';
exports.icon = 'lightbulb-o';
exports.dashboard = true;
exports.flowboard = true;
exports.googlesmarthome = true;
exports.color = '#5CB36D';
exports.input = 2;
exports.output = 1;
exports.click = true;;
exports.options = { nicknames: 'light', reportstate: false, use_status_input: true };
exports.readme = `# Device - Light
### Inputs
- #1 -> set (sends data to output)
- #2 -> status feedback (sets new state and updates dashboard and flowboard)

To turn the light on/off send an object with 'on' property
- { on: true/false }

Use the same data as above for status feedback on input #2

### Output
\`\`\`javascript
{
	name: 'Light name',
	id: 'xxxxxxx',
	type: 'LIGHT',
	on: true // or false
	// brightness: 0,		NOT IMPLEMENTED
	// color_spectrum: 0,	NOT IMPLEMENTED
	// color_temperature: 0	NOT IMPLEMENTED
}
\`\`\`
`;

exports.html = `<div class="padding">
	<p>The label you specify above will apear in DashBoard component's settings form.</p>
	<div class="row">
		<div class="col-md-4">
			<div data-jc="textbox__nicknames__placeholder:light;required:true" class="m">@(Nicknames) (@(separated by comma))</div>
			<div data-jc="checkbox__use_status_input">@(Use status input)</div>
			<div class="help m">@(If checked the status is set based on the data comming to status input (input #2).)</div>
			<div data-jc="checkbox__reportstate">@(Report state to Google) (@(optional))</div>
		</div>
	</div>
</div>`;

exports.install = function(instance) {
	// hack to allow googlefullfilment to this
	instance.googlesmarthome = true;

	var onVals = [true, 1, 'on', '1'];

	var device = {
		id: instance.id,
		type: 'action.devices.types.LIGHT',
		traits: [
			'action.devices.traits.OnOff',
			'action.devices.traits.Brightness',
			'action.devices.traits.ColorSetting'
		],
		name: {
			defaultNames: [
				'The Light'
			],
			name: '',
			nicknames: []
		},
		willReportState: false,
		attributes: {
			colorModel: 'rgb'
		},
		deviceInfo: {
			manufacturer: 'ThingsHub',
			model: 'Light',
			hwVersion: '1.0',
			swVersion: '1.0'
		},
		customData: {
			// fooValue: 12,
			// barValue: false,
			// bazValue: 'dancing alpaca'
		}
	};

	// https://developers.google.com/actions/smarthome/traits/colorsetting
	var state = {
		online: true,
		brightness: 100,
		on: false,
		color: {
			spectrumRgb: 16711935
		}
	};

	instance.custom.sync = function() {
		return device;
	};

	instance.custom.query = function(customData) {
		device.customData = customData;
		return state;
	};

	var commands = [
		'action.devices.commands.OnOff',
		'action.devices.commands.BrightnessAbsolute',
		'action.devices.commands.ColorAbsolute'
	];

	instance.custom.exec = function(ex) {
console.log('EXEC', ex);
		if (!commands.includes(ex.command))
			return { errorCode: 'hardError', status: 'ERROR' };

		var p = ex.params;

		typeof(p.on) === 'boolean' && (state.on = p.on);
		p.brightness && (state.brightness = p.brightness);
		p.spectrumRGB && (state.color.spectrumRGB = p.color.spectrumRGB);		
		

		var s = CLONE(state);
		s.status = 'SUCCESS';
		s.states = state;

		send();

		return s;
	};

	var status = () => {
		console.log('-------------STATUS---------------');
		instance.status('Light is: ' + (state.on ? 'On' : 'Off'));
		instance.dashboard('status', { id: device.id, state: state });
		instance.flowboard('status', { id: device.id, state: state });
	}

	function toggle() {		
		state.on = !state.on;
		send();
	}

	function send(){
		console.log('-------------SEND---------------');
		instance.send2({ id: device.id, state: state });
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

exports.id = 'rpionewire';
exports.title = 'OneWire';
exports.group = 'Raspberry Pi';
exports.color = '#E30B5D';
exports.input = true;
exports.output = true;
exports.author = 'Martin Smola';
exports.icon = 'microchip';
exports.version = '1.0.0';
exports.options = {  };

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-6">
			<div data-jc="dropdown__action__datasource:onewire_actions" class="m">@(Action)</div>
			<div data-bind="settings.rpionewire.action__hide:value == 'list'">
				<div data-jc="dropdown__id__datasource:onewire_devices" class="m">@(Device)</div>
				<div data-bind="settings.rpionewire.action__show:value == 'readDS2438'">
					<div data-jc="textbox__lumcoeficient__type:number">@(Luminosity coeficient of adjustment) (@(default) 12000)</div>
					<div class="help m">Result = sensor-value x coeficient</div>
					<div data-jc="textbox__zerooffset__type:number" class="m">@(Zero offset) (V)</div>
					<div data-jc="textbox__slope__type:number" class="m">@(Slope) (mV/%RH)</div>
				</div>
			</div>
		</div>
	</div>
</div>
<script>
	var onewire_devices = [];
	ON('open.rpionewire', function(component, options) {
		TRIGGER('list_onewire_devices', 'onewire_devices');
		TRIGGER('list_onewire_actions', 'onewire_actions');
	});
	ON('save.rpionewire', function(component, options) {
		!component.name && (component.name = options.id);
	});
</script>`;

exports.readme = `# OneWire
!!! ONLY WORKS ON RASPBERRY PI !!!
!!! Make sure to enable the 1-wire bus on GPIO4 (physical pin 7) !!!

Supported functions:
- read DS2438 temperature (°C), humidity (%) and liminosity (lux)
- read DS18B20 temperature
- list OneWire devices
`;
var Fs = require('fs');
var Path = require('path');
exports.install = function(instance) {

	instance.rpionly = true;
	instance.usedPins = function() {
		return {
			pin: 7,
			type: 'onewire',
			name: instance.name
		}
	};

	instance.on('data', function(flowdata, next) {
		var opts = instance.options;

		if (!ONEWIRE[opts.action]) {
			var err = { error: `Action "${action}" not available.`, id: instance.options.id };
			flowdata.data = error;
			next(flowdata);
			return instance.log('error', error);
		}

		if (opts.action === 'list')
			return ONEWIRE.list(function (err, list) {
				if (err) {
					instance.log('error', err);
					flowdata.data = { error: err };
				} else
					flowdata.data = { devices: list };

				next(flowdata);
			});


		ONEWIRE[opts.action](opts.id, opts, function (err, data) {

			if (err) {
				instance.log('error', err);
				flowdata.data = { error: err, id: opts.id };
			} else
				flowdata.data = { data: data, id: opts.id };

			next(flowdata);
		});
	});

	instance.reconfigure = function(options) {
		var opt = instance.options;

		if (!opt.action || (opt.action !== 'list' && (!opt.id || opt.id.startsWith('Error:'))))
			return opt.id = null, instance.status('Not configured', 'red');

		instance.status('');
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};

var W1_DIR = '/sys/bus/w1/devices/w1_bus_master1';
var W1_MASTER = 'w1_master_slaves';

function parseTemperature(data, digits, degF) {
	var arr = data.split('\n');
	var digits = digits !== undefined ? digits : 2;
	let temp = null;

	// Ensure "crc=00" is not present since this indicates the sensor has been disconnected.
	if (arr[0].indexOf('YES') > -1 && arr[0].indexOf('crc=00') === -1) {
		var out = data.match(/t=(-?(\d+))/);
		if (out !== null) {
			temp = parseInt(out[1], 10) / 1000;
			if (degF) {
				temp = (temp * (9 / 5)) + 32;
			}
			temp = temp.round(digits);
		}
	}

	return temp;
}

function pathExists(fp, cb) {
	return new Promise((resolve, reject) => {
		Fs.stat(fp, (err) => {
			if (err) reject(err);
			else resolve();
		});
	});
}

function read(filepath) {
	return new Promise((resolve, reject) => {
		Fs.readFile(filepath, "utf8", (err, data) => {
			if (err) reject(err);
			else resolve(data);
		});
	});
}

global.ONEWIRE = {
	list: (callback) => {
		const filepath = Path.join(W1_DIR, W1_MASTER);
		Fs.stat(filepath, function(err){
			if (err)
				return callback(err);

			Fs.readFile(filepath, 'utf8', function(err, data){
				if (err)
					return callback(err);

				var devices = data.split('\n');
				callback(null, devices.splice(0, devices.length - 1));
			});
		});
	},
	readDS18B20: function(id, options, callback){

		if (!id)
			return callback('No id specified');

		if (typeof(options) === 'function') {
			callback = options;
			options = {};
		}

		const filepath = Path.join(W1_DIR, id, 'w1_slave');

		Fs.stat(filepath, function(err){
			if (err)
				return callback(`Sensor ${id} not found`);

			Fs.readFile(filepath, 'utf8', function(err, data){
				if (err)
					return callback(err);

				var temp = parseTemperature(data, options.digits, options.degF);
				callback(null, temp);
			});
		});
	},
	readDS2438: function(id, options, callback){

		if (!id)
			return callback('No id specified');

		if (typeof(options) === 'function') {
			callback = options;
			options = {};
		}

		const dir = Path.join(W1_DIR, id);

		Fs.readdir(dir, function(err, list) {
			if (err)
				return callback(`Sensor ${id} not found`);

			var i = 0;
			list.forEach(function(f) {
				if (f === 'temperature' || f === 'vad' || f === 'vdd' || f === 'iad')
					return i++;
			});

			if (i < 4)
				return callback(`Error reading sensor ${id}`);

			var temperature, vad, vdd, iad = '-1';

			(async () => {
				try {
					temperature = await read(Path.join(dir, 'temperature'));
					vad = await read(Path.join(dir, 'vad'));
					vdd = await read(Path.join(dir, 'vdd'));
				} catch(e){
					return callback(`Error reading sensor ${id}, ${e.code}`);
				}
				try {
					iad = await read(Path.join(dir, 'iad'));
				} catch(e){
					console.log(e);
				}

				temperature = +temperature.trim() / 256;
				vdd = +vdd.trim() / 100;
				vad = +vad.trim() / 100;
				iad = +iad.trim() / (4.096 * 4700);

				if (temperature === 0 || vdd === 0 || vad === 0)
					return callback(`Error reading sensor ${id}`);

				/* Compute light (Light sensor BPW 34 S on IAD Input of the DS2438Z) */
				var lux = iad * (!isNaN(options.lumcoeficient) ? options.lumcoeficient : 12000.0);

				var humidity = 0;
				if (options.zerooffset && options.slope)
					humidity = hum(vad, options.zerooffset, options.slope / 1000)
				else
					humidity = (vad / vdd - 0.16) / 0.0062 / (1.0546 - 0.00216 * temperature );

				callback(null, { temperature: temperature.format(2), humidity: humidity.format(2), liminosity: lux });
			})();
		});
	}
};

function hum(vad, offset, slope) {
	offset = (offset / 0.05) * 0.033;
	slope = (slope / 0.05) * 0.033;
	return (vad - offset) / slope;
}

FLOW.trigger('list_onewire_devices', function(next, pin){
	ONEWIRE.list((err, list) => {
		if (err) {
			console.log('list error', err);
			next(['Error: no device found']);
		} else {
			next(list);
		}
	});
});

FLOW.trigger('list_onewire_actions', function(next, pin){
	next([
		{ id: 'readDS2438', name: 'Read DS2438 temperature and humidity' },
		{ id: 'readDS18B20', name: 'Read DS18B20 temperature' },
		{ id: 'list', name: 'List OneWire devices' },
	]);
});
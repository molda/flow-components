exports.id = 'rpiws281x';
exports.title = 'LED WS281x';
exports.group = 'Raspberry Pi';
exports.color = '#E30B5D';
exports.input = true;
exports.output = true;
exports.author = 'Martin Smola';
exports.icon = 'lightbulb';
exports.version = '1.0.0';
exports.options = {  };
exports.npm = ['rpi-ws281x-native'];

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-4">
			<div data-jc="textbox__numleds__type:number">@(Number of LEDs)</div>
			<div class="help m">@(Number of LEDs to be controlled)</div>
			<div data-jc="checkbox__expert">Expert settings</div>
			<div data-bind="?.expert__show:value" class="hidden">
				<div data-jc="textbox__init.gpioPin__type:number">@(GPIO)</div>
				<div class="help m">@(Default GPIO 18 (Pin 12))</div>
				<div data-jc="textbox__init.frequency__type:number">@(PWM Frequency in kHz)</div>
				<div class="help m">@(Min 400, max 800, default 800kHz)</div>
				<div data-jc="textbox__init.dmaNum__type:number">DMA Channel</div>
				<div class="help m">@(Default 5)</div>
				<div data-jc="checkbox__init.invert">Invert</div>
				<div class="help m">@(Check if using inverting level shifter)</div>
			</div>
		</div>
	</div>
</div>
<script>
	ON('open.rpiws281x', function(component, options) {

	});
	ON('save.rpiws281x', function(component, options) {
		!component.name && (component.name = options.id);
	});
</script>`;

exports.readme = `# LED WS281x
!!! ONLY WORKS ON RASPBERRY PI !!!
WS281x data line needs to be connected to Pin 12 (GPIO18)

https://github.com/beyondscreen/node-rpi-ws281x-native
https://github.com/beyondscreen/rpi_ws281x/blob/05248980e760c43fe87ad905ae5f6edf8b824560/README.md

## Input
\`\`\`javascript
{
	data: [ 0xffffff, 0x000000, ... ], // array length same as Number of LEDs
	brigtness: 100, // optional, 0-255
}
\`\`\`
`;

var ws281x;

exports.install = function(instance) {

	ws281x = require('rpi-ws281x-native');

	var ready = false;

	instance.rpionly = true;
	instance.usedPins = function() {
		return {
			pin: instance.options.init.gpioPin,
			type: 'ws281x',
			name: instance.name
		}
	};

	instance.on('data', function(flowdata, next) {
		if (!ready)
			return instance.status('Not configured', 'red');

		var opts = instance.options;
		var data = flowdata.data;
		var arr = data ? data.data : [];

		if (!data || !(arr instanceof Array) || arr.length < 1) {
			flowdata.data = { error: 'Invalid data', data: CLONE(data) };
		} else {

			var err = WS281x.render(arr);
			if (err)
				flowdata.data = { error: err, data: CLONE(arr) };
			else {
				if (data.brigtness && data.brigtness > -1 && data.brigtness < 256)
					WS281x.setBrightness(data.brigtness);
				flowdata.data = { success: true };
			}
		}
		if (flowdata.data.error)
			instance.log('error', flowdata.data);

		next(flowdata);
	});

	instance.reconfigure = function(options) {
		var opt = instance.options;
		ready = false;

		if (!opt.numleds)
			return instance.status('Not configured', 'red');

		opt.init = U.extend({gpioPin: 12, frequency: 800000, dmaNum: 5, invert: false}, opt.init);

		var info = WS281x.init(opt.numleds, opt.init);
		info && instance.log('info', info);
		instance.status('Ready');
		ready = true;
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();

	instance.on('close', function(){
		WS281x.reset();
	});
};

global.WS281x = {
	ready: false,
	leds: 0,
	init: function(numleds, opts){
		WS281x.reset();
		ws281x.init(numleds, opts);
		WS281x.leds = numleds;
		WS281x.ready = true;
	},
	render: function(data, fill){
		if (!(data instanceof Array))
			return 'data is not an array';
		if (!WS281x.ready)
			return 'ws281x not initialized';
		if (!data.length)
			return 'no data';
		if (data.length !== WS281x.leds)
			data = WS281x.fillRemaining(data, WS281x.leds, fill);
		ws281x.render(data);
	},
	reset: function(){
		WS281x.ready && ws281x.reset();
		WS281x.ready = false;
	},
	setBrightness: function(br){
		if (br > 255 || br < 0)
			return 'britness out of range (0-255)';
		WS281x.ready && ws281x.setBrightness(br);
	},
	dimm: function(arr, d) {
		var l = arr.length;
		var tmp = [];
		for (var i = 0; i < l ; i++)
			tmp.push(WS281x.lum(arr[i], d));
		return tmp;
	},
	lum: function(input, lum) {
		var rgb = 0, c, d;
		for (var i = 0; i < 3; i++) {
			c = (input >> i*8) & 255;
			d = Math.round(Math.min(Math.max(0, c + (c * lum)), 255));
			rgb += d << i*8;
		}
		return rgb;
	},
	fillRemaining : function (arr, max, fill) {
		if (arr.length > max)
			return arr.slice(0, max);
		if (arr.length < max)
			for (var i = arr.length; i < max; i++)
				arr.push(fill || 0x000000);
		return arr;
	},
};

// ---- trap the SIGINT and reset before exit
process.on('SIGINT', function () {
  ws281x && ws281x.reset && ws281x.reset();
  process.nextTick(function () { process.exit(0); });
});
exports.id = 'rpigpioin';
exports.title = 'GPIO input';
exports.group = 'Raspberry Pi';
exports.color = '#E30B5D';
exports.input = true;
exports.output = true;
exports.author = 'Martin Smola';
exports.icon = 'microchip';
exports.version = '1.0.0';
exports.npm = ['rpi-gpio'];
exports.options = { interrupt: false };

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-4">
			<div data-jc="textbox__pin__type:number">@(Pin number)</div>
			<div class="help m">@(Physical pin number 1-40)</div>
			<div data-jc="checkbox__interrupt">@(Interrupt)</div>
			<div class="help">@(If checked, it will trigger the flow on state change)</div>
		</div>
	</div>
</div>
<script>
	var settings_rpigpioin_pin;
	function check_gpio_pin() {
		if (settings_rpigpioin_pin === settings.rpigpioin.pin)
			return;
		TRIGGER('check_gpio_pin', settings.rpigpioin.pin, function(used){
			if (used)
				INVALID('settings.rpigpioin.pin');
		});
	};
	WATCH('settings.rpigpioin.pin', check_gpio_pin);
	ON('open.rpigpioin', function(component, options) {
		if (!component.isnew)
			settings_rpigpioin_pin = options.pin;
	});
	ON('save.rpigpioin', function(component, options) {
		!component.name && (component.name = 'Pin: ' + options.pin);
	});
</script>`;

exports.readme = `# GPIO input`;

exports.install = function(instance) {

	instance.rpionly = true;
	instance.usedPins = function() {
		return {
			pin: pin,
			type: 'input',
			name: instance.name
		}
	};

	var gpio = require('rpi-gpio');
	var ready = false;
	var pin;

	instance.on('data', function(flowdata, next) {
		if (!ready)
			return;

		var data = flowdata.data;
		var opt = instance.options;

		gpio.read(opt.pin, function(err, val){
			if (err)
				flowdata.data = { pin: pin, error: err };
			else
				flowdata.data = { pin: pin, data: val };

			next(flowdata);
		});
	});

	var ignore = false;

	function interrupt(pin, val) {
		if (pin !== instance.options.pin)
			return;
		// debounce
		if (!ignore) {
			ignore = true;
			instance.send({ pin: pin, data: val });
			setTimeout(function(){
				ignore = false;
			}, 50);
			return;
		}
	}

	instance.reconfigure = function(options) {
		var opt = instance.options;
		if (!opt.pin)
			return instance.status('Not configured', 'red');

		pin = null;

		if (RPIGPIO.usedPins(opt.pin))
			return instance.status('Already in use', 'red');

		pin = opt.pin;

		gpio.removeListener('change', interrupt);

		if (opt.interrupt) {
			gpio.on('change', interrupt);
		}

		gpio.setup(opt.pin, gpio.DIR_IN, opt.interrupt ? gpio.EDGE_BOTH : gpio.EDGE_NONE, function(err){
			if (!err) {
				ready = true;
				instance.status('Ready');
				return;
			}

			ready = false;
			instance.log('error', { error: err, msg: err.toString(), edge: opt.interrupt });
			return instance.status('Error', 'red');
		});		
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};
exports.id = 'rpigpioout';
exports.title = 'GPIO output';
exports.group = 'Raspberry Pi';
exports.color = '#E30B5D';
exports.input = true;
exports.output = false;
exports.author = 'Martin Smola';
exports.icon = 'microchip';
exports.version = '1.0.0';
exports.npm = ['rpi-gpio'];
exports.options = { state: 'none' };

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-4">
			<div data-jc="textbox__pin__type:number">@(Pin number)</div>
			<div class="help m">@(Physical pin number 1-40)</div>
			<div data-jc="dropdown__state__items:none,low,high" class="m">@(Set initial state)</div>
			<div data-jc="textbox__property__placehilder:value">@(Path to a property)</div>
			<div class="help m">@(Leave empty if the value is the incomming data itself)</div>
		</div>
	</div>
</div>
<script>
	var settings_rpigpioout_pin;
	function check_gpio_pin() {
		if (settings_rpigpioout_pin === settings.rpigpioout.pin)
			return;
		TRIGGER('check_gpio_pin', settings.rpigpioout.pin, function(used){
			if (used)
				INVALID('settings.rpigpioout.pin');
		});
	};
	WATCH('settings.rpigpioout.pin', check_gpio_pin);
	ON('open.rpigpioout', function(component, options) {
		if (!component.isnew)
			settings_rpigpioout_pin = options.pin;
	});
	ON('save.rpigpioout', function(component, options) {
		!component.name && (component.name = 'Pin: ' + options.pin);
	});
</script>`;

exports.readme = `# GPIO output`;

exports.install = function(instance) {

	instance.rpionly = true;
	instance.usedPins = function() {
		return {
			pin: pin,
			type: 'output',
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
		var val;
		if (!opt.property)
			val = data;
		else
			val = U.get(data, opt.property);

		if (val === true || val === 1 || val === 'on' || val === false || val === 0 || val === 'off')
			gpio.write(opt.pin, val, function(err){
				flowdata.data = { pin: opt.pin, data: val };
				if (err) {
					instance.debug(err);
					flowdata.data.error = err;
					return next(flowdata);
				}
				flowdata.data.success = true;
				next(flowdata);
			});
	});

	instance.reconfigure = function(options) {
		var opt = instance.options;
		if (!opt.pin)
			return instance.status('Not configured', 'red');

		pin = null;

		if (RPIGPIO.usedPins(opt.pin))
			return instance.status('Already in use', 'red');

		pin = opt.pin;

		var dir = opt.state === 'high' ? gpio.DIR_HIGH : opt.state === 'low' ? gpio.DIR_LOW : gpio.DIR_OUT;

		gpio.setup(opt.pin, dir, function(err){
			if (!err) {
				ready = true;
				instance.status('Ready');
				return;
			}

			ready = false;
			instance.log('error', { error: err, msg: err.toString(), dir: dir });
			return instance.status('Error', 'red');
		});		
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};
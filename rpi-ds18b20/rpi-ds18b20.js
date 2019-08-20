exports.id = 'rpids18b20';
exports.title = 'DS18B20';
exports.group = 'Raspberry Pi';
exports.color = '#656D78';
exports.input = true;
exports.output = true;
exports.author = 'Martin Smola';
exports.icon = 'thermometer-half';
exports.version = '1.0.0';
exports.npm = ['ds18b20-raspi'];
exports.options = {  };

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-3">
			<div data-jc="dropdown__id__datasource:onewire_devices" class="m">@(Device)</div>
			<div data-jc="textbox__delay__type:number">@(Delay between reads in seconds)</div>
			<div class="help">@(Default 0, only reads when triggered by input)</div>
		</div>
	</div>
</div>
<script>
	var onewire_devices = [];
	

	ON('open.rpids18b20', function(component, options) {
		TRIGGER('list_onewire_devices', 'onewire_devices');
	});
	ON('save.rpids18b20', function(component, options) {
		!component.name && (component.name = options.id);
	});
</script>`;

exports.readme = `# DS18B20 Temperature sensor
!!! ONLY WORKS ON RASPBERRY PI !!!
!!! Make sure to enable the 1-wire bus on GPIO4 (physical pin 7) !!!
`;

exports.install = function(instance) {

	var interval;


	instance.on('data', function(flowdata, next) {
		if (!instance.options.id)
			return;


		ONEWIRE.readDS18B20(instance.options.id, function(err, temp){
			if (err) {
				instance.debug(err);
				flowdata.data = { error: err, id: instance.options.id };
			} else {
				flowdata.data = { temp: temp, id: instance.options.id };
			}
			next(flowdata);
		});
	});

	instance.reconfigure = function(options) {
		var opt = instance.options;

		clearInterval(interval);

		if (!opt.id || opt.id.startsWith('Error:'))
			return opt.id = null, instance.status('Not configured', 'red');

		if (opt.delay > 0)
			interval = setInterval(function(){
				ONEWIRE.readDS18B20(opt.id, function(err, temp) {
					if (err) {
						flowdata.data = { error: err, id: instance.options.id };
						instance.log('error', flowdata.data);
					} else {
						flowdata.data = { temp: temp, id: instance.options.id };
					}
					instance.send(flowdata);
				});
			}, opt.delay * 1000);

		RPIGPIO.usedPins[7] = {
			pin: 7,
			type: '1-wire'
		};
	
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();

	instance.on('close', function(){
		var arr = FLOW.findByComponent('rpids18b20');
		if (arr.length === 1) {
			delete RPIGPIO.usedPins[7];
		}
	});
};
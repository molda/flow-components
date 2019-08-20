exports.id = 'rpigpio';
exports.title = 'RPi GPIO';
exports.group = 'Raspberry Pi';
exports.color = '#E30B5D';
exports.input = false;
exports.output = false;
exports.author = 'Martin Smola';
exports.icon = 'microchip';
exports.version = '1.0.0';

exports.html = `<div class="padding">
	<section class="m">
		<label><i class="fa fa-database"></i>@(Pins used by other components)</label>
		<div class="padding">
			<div class="row">
				<div class="col-md-6">						
					<table style="margin:5px;">
						<thead>
							<tr style="border: 1px solid #e4e4e4;"><th class="col-md-2"><strong>Pin</strong></th><th class="col-md-2"><strong>Type</strong></th><th class="col-md-3"><strong>Name</strong></th></tr>
						</thead>
						<tbody data-jc="repeater__used_gpio_pins" data-jc-noscope="true">
							<script type="text/html">
								<tr style="border:1px solid #f3f3f3;border-top:none;"><td class="col-md-2">{{ pin }}</td><td class="col-md-2">{{ type }}</td><td class="col-md-3">{{ name }}</td></tr>
							</script>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</section>
</div>
<script>
	var used_gpio_pins = [];	
	ON('open.rpigpio', function(component, options) {
		TRIGGER('list_used_pins', 'used_gpio_pins');
	});
</script>`;

exports.readme = `# RPi GPIO
!!! ONLY WORKS ON RASPBERRY PI !!!
`;

exports.install = function(){

};

FLOW.trigger('list_used_pins', function(next, pin){
	next(RPIGPIO.usedPins());
});

// check if pin is used
FLOW.trigger('check_gpio_pin', function(next, pin){
	next(RPIGPIO.usedPins(pin));
});

global.RPIGPIO = {
	usedPins: function(pin) {
		var comps = FLOW.find(function(com){
			return com.rpionly;
		});

		var pins = [];

		comps.forEach(function(com){
			var upins = com.usedPins();
			pins = pins.concat(upins);
		});

		if (pin) {
			var used = false;
			pins.forEach(function(p){
				if (p === pin)
					used = true;
			});
			return used;
		}

		return pins;
	}
};
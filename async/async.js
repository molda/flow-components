exports.id = 'async';
exports.title = 'Async';
exports.color = '#656D78';
exports.icon = '';
exports.group = 'Common';
exports.input = true;
exports.output = true;
exports.version = '1.0.0';
exports.author = 'Martin Smola';

exports.readme = `# Async
Assigns data returned from components to a given object property.

## Outputs
- 1st > final data object with assigned properties
- 2nd - nth > data returned to these outputs will be assigned to the given properties of an object
`;

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-4">
			<div data-jc="radiobutton__extend__items:0|Overwrite,1|Extend;type:number;required:true;inline:false">@(Overwrite or extend the incoming data?)</div>
			<div class="help m">@(If the incomming data is not an object Extend won't work.)</div>
			<div data-jc="textboxlist__properties__placeholder:e.g. temperature and press enter;icon:table">@(Properties) (@(minimum is 1))</div>
			<div class="help m">@(Hit enter after you type in the value)</div>
		</div>
	</div>
</div>
<script>
	var async_outputs_count;

	ON('open.async', function(component, options) {
		async_outputs_count = ((options.properties && options.properties.length) || 0) + 1;
		if (!options.extend)
			options.extend = 0;
	});

	ON('save.async', function(component, options) {
		var ol = ((options.properties && options.properties.length) || 0) + 1;
		if (async_outputs_count !== ol) {
			if (flow.version < 511) {
				component.connections = {};
				setState(MESSAGES.apply);
			}
			component.output = ol;
		}
	});
</script>`;

exports.install = function(instance) {

	instance.on('data', function(flowdata, next){
		var data = {};
		var opt = instance.options;
		var props = opt.properties;
		var fdata = instance.make();

		props.wait(function(prop, another, index){

			var ok = instance.callback(index, fdata, function(index, fdata){
				if (fdata == undefined)
					fdata = index;
				data[prop] = CLONE(fdata.data);
				another();
			});

			!ok && another();

		}, function done(){

			if (flowdata.data != null && opt.extend && typeof(flowdata.data) === 'object' && !(flowdata.data instanceof Array))
				flowdata.data = U.extend(flowdata.data || {}, data); 
			else
				flowdata.data = data;
			
			next(0, flowdata);
		});
	});

	instance.on('options', reconfigure);
	reconfigure();

	function reconfigure() {
		var opt = instance.options;

		if (!opt.properties || !opt.properties.length)
			return instance.status('Not configured', 'red');

		instance.status('');
	};
};
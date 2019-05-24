exports.id = 'datamapper';
exports.title = 'Data mapper';
exports.group = 'Parsers';
exports.color = '#37BC9B';
exports.input = ['|Data to be mapped'];//, '|Test data'];
exports.output = ['|Mapped data'];
exports.author = 'Martin Smola';
exports.icon = 'random';
exports.version = '1.0.0';
exports.options = {  };

exports.html = `
<style>
#datamapper_keyvalue .ui-keyvalue-item { transition: background-color .5s; }
#datamapper_keyvalue .ui-keyvalue-item-key { width: calc(50% - 13px); float: left; font-weight: normal; }
#datamapper_keyvalue .ui-keyvalue-item-value { margin: 0; width: calc(50% - 20px); float: left; }
#datamapper_keyvalue .bg-red { background-color: #ff8686; }
</style>
<div class="padding">
	<div class="row">
		<div class="col-md-4 m">
			<div data-jc="jsontree" data-jc-path="json" data-jc-config="click:datamapper_click">@(Sample JSON data)</div>
		</div>
		<div class="col-md-8 m" id="datamapper_keyvalue">
			<div class="m" data-jc="keyvalue" data-jc-path="mapping" data-jc-config="placeholderkey:Click on an item in the tree;placeholdervalue:Enter the path"><b>@(Mapping)</b></div>
			<hr />
			<div data-jc="keyvalue" data-jc-path="custom" data-jc-config="placeholderkey:path in an output object;placeholdervalue:enter a value and hit enter"><b>@(Custom properties and values)</b></div>
			<div class="help">@(Only string values supported.)</div>
		</div>
	</div>
</div>
<script>

	var $kv = $('#datamapper_keyvalue');

	function datamapper_click(path) {
		if (!path)
			return;

		if (!settings.datamapper.mapping)
			settings.datamapper.mapping = {};

		var mapping = settings.datamapper.mapping;
		if (mapping[path] !== undefined) {
			var $input = $kv.find('.ui-keyvalue-item-key input[value="{0}"]'.format(path));
			var $p = $input.parent().parent();
			$p.aclass('bg-red');
			console.log('HIGHLIGHT', mapping);
			setTimeout(function(){
				$p.rclass('bg-red');
			}, 600);
		} else {
			mapping[path] = '';
			SET('settings.datamapper.mapping', mapping);
			var $input = $kv.find('.ui-keyvalue-item-key input[value="{0}"]'.format(path));
			console.log('UPDATE', mapping);
		}
	};

	ON('save.datamapper', function(component, options) {
		var builder = [];
		builder.push('### @(Configuration)');
		builder.push('');

		var mapping = options.mapping || {};
		Object.keys(mapping).forEach(function(k){
			builder.push('- ' + k + ' --> ' + mapping[k]);
		});
		component.notes = builder.join('\\n');
	});


</script>`;

exports.readme = `# Data mapper

`;

exports.install = function(instance) {

	instance.on('data', function(flowdata){

		var opts = instance.options;
		var data = flowdata.data;
		var newdata = {};

		if (opts.custom)
			newdata = CLONE(opts.custom);

		var mapping = opts.mapping;

		if (!data || !mapping)
			return;
		
		Object.keys(mapping).forEach(function(key){
			var val = U.get(data, key);
			U.set(newdata, mapping[key], val);
		});

		flowdata.data = newdata;

		instance.send(flowdata);			
	});
};

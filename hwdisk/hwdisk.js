exports.id = 'hwdisk';
exports.title = 'Disk';
exports.version = '1.0.0';
exports.author = 'Martin Smola';
exports.group = 'Hardware monitor';
exports.color = '#F6BB42';
exports.input = 1;
exports.output = 1;
exports.icon = 'hdd-o';
exports.options = { path: '/' };
exports.readme = `# Disk monitoring

This component monitors disk \`bytes\` consumption in Linux systems. It uses \`df\` command.

__Data Example__:

\`\`\`javascript
{
	total: 474549649408,
	used: 39125245952,
	free: 411294994432
}
\`\`\``;

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-3 m">
			<div data---="textbox__path__placeholder:/;required:true">@(Path)</div>
		</div>
	</div>
</div>`;

exports.install = function(instance) {

	var current = { total: 0, used: 0, free: 0, path: '', type: '', percentUsed: 0 };

	function run(callback) {

		require('child_process').exec('df -hTB1 ' + instance.options.path, function(err, response) {

			if (err) {
				instance.error(err);
				return;
			}

			response.parseTerminal(function(line) {
				if (line[0][0] !== '/')
					return;
				current.total = line[2].parseInt();
				current.free = line[4].parseInt();
				current.used = line[3].parseInt();
				current.path = instance.options.path || '/';
				current.type = line[1];
				current.percentUsed = Math.round(current.used / (current.total / 100));
				current.percentFree = Math.round(current.free / (current.total / 100));
				current.percentUnavailable = Math.abs(current.percentUsed + current.percentFree - 100);
				callback();
			});
		});
	};

	instance.on('data', function(flowdata, next){
		run(function(){
			flowdata.data = current;
			next(flowdata);
			instance.status(current.free.filesize() + ' / ' + current.total.filesize());
		});
	});
};
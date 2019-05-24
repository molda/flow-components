exports.id = 'hwmemory';
exports.title = 'Memory';
exports.version = '1.0.0';
exports.author = 'Martin Smola';
exports.group = 'Hardware monitor';
exports.color = '#F6BB42';
exports.input = 1;
exports.output = 1;
exports.icon = 'microchip';
exports.options = { };
exports.readme = `# Memory monitoring

This component monitors memory \`bytes\` consumption in Linux systems. It uses \`free\` command.

__Data Example__:

\`\`\`javascript
{
	total: 33558769664,
	used: 1998868480,
	free: 2653708288
}
\`\`\``;

exports.html = ``;

exports.install = function(instance) {

	var current = { total: 0, used: 0, free: 0 };

	instance.on('data', function(flowdata, next){
		require('child_process').exec('free -b -t', function(err, response) {

			if (err) {
				instance.error(err);
				flowdata.data = current;
				next(flowdata);
				return;
			}

			var memory = response.split('\n')[1].match(/\d+/g);
			current.total = memory[0].parseInt();
			current.used = memory[1].parseInt() - memory[3].parseInt();
			current.free = current.total - current.used;
			current.percentFree = Math.round(current.free / (current.total / 100));
			current.percentUsed = Math.round(current.used / (current.total / 100));
			instance.status(current.free.filesize() + ' / ' + current.total.filesize());
			flowdata.data = current;
			next(flowdata);
		});
	});
};
exports.id = 'hwcpu';
exports.title = 'CPU';
exports.version = '1.0.0';
exports.author = 'Martin Smola';
exports.group = 'Hardware monitor';
exports.color = '#F6BB42';
exports.input = true;
exports.output = true;
exports.icon = 'microchip';
exports.readme = `# CPU monitoring

This component monitors CPU \`% percentage\` consumption in Linux systems. It uses \`mpstat\` command.

\`sudo apt install sysstat\`

__Data Example__:

\`\`\`javascript
{
	cpu: 30, // percentage
	cores: [4, 60, 0], // percentage
	count: 3 // count of cores
}
\`\`\``;

exports.html = ``;

exports.install = function(instance) {

	function run(callback) {

		require('child_process').exec('mpstat 3 1', (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			
			var avg = stdout.split('\n');

			if (!avg || !avg.length)
				return;

			avg = avg[4].split('  ').trim();

			if (!avg[11])
				return;

			avg = (100 - avg[11].parseFloat2()).format(2);

			callback(avg);
		});
	};

	instance.on('data', function(flowdata, next){
		run(function(cpu){
			flowdata.data = cpu;
			next(flowdata);
			instance.status(cpu + '%');
		});
	});
};
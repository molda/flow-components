exports.id = 'mysqlquery';
exports.title = 'MySQL Query';
exports.group = 'Databases';
exports.color = '#4479a1';
exports.input = true;
exports.output = true;
exports.author = 'Martin Smola';
exports.icon = 'database';
exports.version = '1.0.0';
exports.options = { id: '', fields: false };

exports.html = `<div class="padding">
	<div data-jc="dropdown__id__datasource:mysqlconfig.connections;empty:;required:true">@(MySQL Connection)</div>
	<div class="help m">@(Make sure to add 'MySQL Connection' node first.)</div>
	<div data-jc="checkbox__fields" class="b">@(Add fields?)</div>
	<div class="help">@(Definition of the fields from the table.)</div>
</div>
<script>
	var mysqlconfig = { connections: [] };
	ON('open.mysqlquery', function(component, options) {
		TRIGGER('mysql.connections', 'mysqlconfig.connections');
	});
	ON('save.mysqlquery', function(component, options) {
		!component.name && (component.name = options.id);
	});
</script>`;

exports.readme = `# MySQL Query
[MySQL on NPM](https://www.npmjs.com/package/mysql)

## Simple query
\`\`\`javascript
{
	sql: 'SELECT * FROM tablename;'
}
\`\`\`

## Advanced queries

__Select__
\`\`\`javascript
{
	sql: 'SELECT * FROM \`books\` WHERE \`author\` = ?',
	values: ['David']
}
\`\`\`

__Insert__
\`\`\`javascript
{
	sql: 'INSERT INTO Users SET ?',
	values: { 
		firstname: 'John',
		lastname: 'Smith'
	}
}
\`\`\`

__Multiple insert__
Important: please notice the double brackets [[ ]]
\`\`\`javascript
{
	sql: 'INSERT INTO Users (firstname, lastname) SET ?',
	values: [[ ['John', 'Smith'], ['John1', 'Smith1'] ]]
}
\`\`\`

## Output
\`\`\`javascript
{
	query: <input data>,        // the above mentioned object
	error: <error>.             // the error object if an error occurs
	results: <results from db>,
	fields: <fields definition> // if enabled in settings
}
\`\`\`
`;

exports.install = function(instance) {

	var pool;

	var nopool = { error: 'No connection available' };
	var nosql = { error: 'No sql string' };

	ON('mysql.status', mysqlstatus);

	function mysqlstatus(status, id, msg) {
		if (id !== instance.options.id)
			return;

		switch(status) {
			case 'connected':
			case 'disconnected':
			case 'close':
				reconfigure();
				break;
			case 'error':
				break;
		};
	};

	function reconfigure() {

		var opts = instance.options;

		if (!opts.id)
			return instance.status('Not configured', 'red');

		pool = MYSQL.getPool(opts.id);

		if (!pool)
			return instance.status('No connection', 'red');

		instance.status('Ready');

	};

	instance.on('options', reconfigure);
	reconfigure();

	instance.on('data', function(flowdata){

		if (!pool) {
			instance.status('No connection', 'red');
			return instance.send(nopool);
		}

		var d = flowdata.data;
		if (!d.sql)
			return instance.send(nosql);

		var options = {
			sql: d.sql
		};

		d.values && (options.values = d.values);
		pool.query(options, querycallback);

		function querycallback(error, results, fields){
			flowdata.data = {
				query: d
			};

			if (error) {
				flowdata.data.error = error;
			} else {
				flowdata.data.results = results;
				instance.options.fields && (flowdata.data.fields = fields);
			}

			instance.send(flowdata);
		};
	});
};
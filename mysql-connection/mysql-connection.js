exports.id = 'mysqlconnection';
exports.title = 'MySQL Connection';
exports.group = 'Databases';
exports.color = '#4479a1';
exports.input = false;
exports.output = false;
exports.author = 'Martin Smola';
exports.icon = 'database';
exports.version = '1.0.0';
exports.npm = ['mysql'];
exports.options = { connectionLimit: 10, host: 'localhost', user: '', password: '', database: '' };

exports.html = `<div class="padding">
	<div data-jc="textbox__host__placeholder:localhost;required:true" class="m">@(Hostname or IP)</div>
	<div data-jc="textbox__port__placeholder:3306" class="m">@(Port) (@(default) 3306)</div>
	<div data-jc="textbox__database__placeholder:my_db;required:true" class="m">@(Database name)</div>
	<div data-jc="textbox__user__placeholder:admin" class="m">@(Username)</div>
	<div data-jc="textbox__password__type:password" class="m">@(Password)</div>
	<div data-jc="textbox__connectionLimit__type:number" class="m">@(Connection limit) (@(default) 10)</div>
</div>
<script>
	ON('save.mysqlconnection', function(component, options) {
		options.port = options.port || 3306;
		options.connectionLimit = options.connectionLimit || 10;
		options.id = (options.user ? options.user + '@' : '') + options.host + ':' + options.port + '/' + options.database;
		!component.name && (component.name = options.id);
	});
</script>`;

exports.readme = `# MySQL Connection
[MySQL on NPM](https://www.npmjs.com/package/mysql)
`;

exports.install = function(instance) {

	var mysql = require('mysql');
	var pool;

	instance.reconfigure = function() {

		var opts = instance.options;

		if (!opts.database)
			return instance.status('Not configured', 'red');

		MYSQL_CONNECTIONS = MYSQL_CONNECTIONS.filter(function(conn){
			if (conn.id === opts.id) {
				conn.pool && conn.pool.end && conn.pool.end(function (err) {
					err && instance.debug(err);
					EMIT('mysql.status', 'disconnected', opts.id);
				});
				return false;
			}
			return true;
		});

		var conf = {
			host            : opts.host || 'localhost',
			port            : opts.port || 3306,
			database        : opts.database,
			connectionLimit : opts.connectionLimit || 10
		};

		opts.user && (conf.user = opts.user);
		opts.password && (conf.password = opts.password);

		pool  = mysql.createPool(conf);
		MYSQL_CONNECTIONS.push({ id: opts.id, pool: pool });

		EMIT('mysql.status', 'connected', opts.id);
		instance.status('Ready');

	};

	instance.on('close', function(){

		pool && pool.end(function (err) {
			err && instance.debug(err);
			EMIT('mysql.status', 'disconnected', instance.options.id);
		});
	});


	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};

global.MYSQL = {
	getPool: function(id) {
		var pool = MYSQL_CONNECTIONS.find('id', id);
		if (pool)
			return pool.pool;
	}
};

var MYSQL_CONNECTIONS = [];

FLOW.trigger('mysql.connections', function(next) {
	var conns = [];
	MYSQL_CONNECTIONS.forEach(n => conns.push({ id: n.id, name: n.id }));
	next(conns);
});
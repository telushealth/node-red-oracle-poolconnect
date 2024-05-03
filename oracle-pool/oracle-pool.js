module.exports = function(RED) {
    //#region requires
    const oracledb = require('oracledb')
    oracledb.fetchAsString = [ oracledb.CLOB ];

    //#endregion
    
    //#region Execution Node
    
    function OraclePoolExecutionNode(config) {
        RED.nodes.createNode(this,config);
        let node = this;
        node.server = RED.nodes.getNode(config.server);
	node.maxrows = config.maxrows || 100;
	node.stats = config.sendStats || "true";
	node.outputConn = config.outputConn || "close";
	    
        node.on('input', async function(msg, send, done) {
            let connection;
	    msg.payload = {};
            try {
                let sql = msg.sql;
                let binds, options, result;

                // dbConfig =  {
                //     user: node.server.user,
                //     password: node.server.password,
                //     connectString : `${node.server.host}:${node.server.port}/${node.server.database}`,
                //     externalAuth  : false
                //   };
                // connection = await oracledb.getConnection(dbConfig);
		if (msg.connection != undefined) {
			node.warn("Use connection");
			connection = msg.connection;
		} else {
			node.warn("New connection");
			connection = await node.server.pool.getConnection();
		}
                
                binds = {};

                options = {
                	outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
			maxRows: node.maxrows,
			autoCommit: true,
	                // extendedMetaData: true,               // get extra metadata
	                // prefetchRows:     100,                // internal buffer allocation size for tuning
	                // fetchArraySize:   100                 // internal buffer allocation size for tuning
                };
                result = await connection.execute(sql, binds, options);
                msg.payload = result;
            } catch (err) {
		if(done){
			done(err);
		}
		else {
			node.error(err)
		}
			
            } finally {
                if (connection) {
                    try {
			if (node.outputConn != "close") {
				msg.connection = connection;
			} else {
				await connection.close();
				delete msg.connection; //à valider
			}
                    } catch (err) {
			if(done){
				done(err);
			}
			else {
				node.error(err)
			}
                    }
                }
            }
	    if (node.stats == "true") {
            	node.send([msg, {inUse: node.server.pool.connectionsInUse, open: node.server.pool.connectionsOpen}]);
	    } else {
		node.send([msg, null]);
	    }
        });
	node.on('close', function() {
    		// tidy up any state
	});
    }
	
    //#endregion
    
    //#region Config Node
    
    function OraclePoolConfigNode(n) {
        RED.nodes.createNode(this,n);
	let node = this;
        this.host = n.host;
        this.port = n.port;
        this.database = n.database;
        this.user = n.user;
        this.password = n.password;
	this.poolMin = parseInt(n.poolMin);
	this.poolMax = parseInt(n.poolMax);
	this.poolIncrement = parseInt(n.poolIncrement);
	this.pool = null;
	oracledb.createPool({
		user: this.user,
	    	password: this.password,
	    	connectString : `${this.host}:${this.port}/${this.database}`,
	    	externalAuth  : false,
		poolIncrement : parseInt(this.poolIncrement),
            	poolMin       : parseInt(this.poolMin),
            	poolMax       : parseInt(this.poolMax),
		// enableStatistics : true,
		// poolAlias : this.name
	}, function (err, pool){
		if (err) {
			node.error(err);
		} else {
			node.pool = pool;
			// node.warn("Pool created");
		}
	});
	    
	this.on('close', async function() {
    		await this.pool.close(5);
	});
    }

    //#endregion
    
    RED.nodes.registerType("oracle-pool", OraclePoolExecutionNode);
    RED.nodes.registerType("oracle-pool-config", OraclePoolConfigNode);

}












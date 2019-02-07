var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var authorizedIPs = [];
var authorizedUsernames = [];

app.get('/', function(req, res){
	
	/*
	var addr = req.connection.remoteAddress;
	if(authorizedIPs.indexOf(addr) > -1)
	{
		res.sendFile(__dirname + '/index.html');
	}
	else{
		console.log('unauthorized address '+addr);
		res.sendStatus(404);
	}
	*/
	
	// for tests only
	res.sendFile(__dirname + '/index.html');
});

app.get('/username', function(req, res){
	
	var addr = req.connection.remoteAddress;
	var idx = authorizedIPs.indexOf(addr);
	if(idx > -1)
	{
		res.send(authorizedUsernames[idx]);
	}
	else
	{
		/*
		console.log('unauthorized address '+addr);
		res.sendStatus(404);
		*/
		res.send('');
	}
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});

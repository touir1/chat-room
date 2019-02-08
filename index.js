var express = require('express');
var app = express();
var bodyParser = require("body-parser");
var _ = require('lodash');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('chatapp');

//db.close();

var authorizedIPs = [];
var authorizedUsernames = [];

var connectedUsers = [];
var connectedEmails = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

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
	//console.log(' => /username');
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

app.post('/api/inscription', function(req, res) {
	console.log(' => /api/inscription');
	console.log(req.body);
    var email = req.body.email;
    var password = req.body.password;
	var firstname = req.body.firstname;
	var lastname = req.body.lastname;
	
	console.log(email,password);
	
	db.run("INSERT INTO users (email, password,firstname,lastname) VALUES (?,?,?,?)",email,password,firstname,lastname, function(err){
		if(err){
			console.log(err);
			res.send("failed");
		}
		else{
			connectedEmails.push(email);
			res.send("success");
		}
	});

});

app.post('/api/connection', function(req, res) {
	console.log(' => /api/connection');
	console.log(req.body);
    var email = req.body.email;
    var password = req.body.password;
	
	console.log(email,password);
	
	db.get('SELECT email,firstname,lastname FROM users WHERE email = ? and password = ?',email,password,function(err, result){
		if(err){
			console.log(err);
			res.send("failed");
		}
		else{
			console.log(result);
			if(result){
				connectedEmails.push(email);
				res.json(result);
			}
			else{
				res.send("failed");
			}
		}
	});
	
});

io.on('connection', function(socket){
  var emailValue = socket.handshake.query.email;
  if(emailValue && connectedEmails.indexOf(emailValue)>-1){
	  
	  connectedUsers.push({email: emailValue,socketid: socket.id});
	  console.log('user with email '+ emailValue + ' connected');
		
	  socket.on('chat message', function(msg){
		io.emit('chat message', msg);
	  });
	  
	  socket.on('disconnect', function () {
		console.log('user with email '+ emailValue + ' disconnected');
		connectedUsers = _.remove(connectedUsers, function(el) {
			return el.email == emailValue;
		});
	  });
  }
  else{
	  socket.disconnect();
  }
});

http.listen(port, function(){
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, firstname TEXT NOT NULL, lastname TEXT NOT NULL)");
  console.log('listening on *:' + port);
});

const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const _ = require('lodash');
const fs = require('fs');
const md5 = require('js-md5');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const propertiesReader = require('properties-reader');

const sqlite3 = require('sqlite3').verbose();

const prop = propertiesReader('configuration/admin.properties');
function getProperty(property){return String(prop.get(property)) || "";}

//db.close();

var authorizedIPs = [];
var authorizedUsernames = [];

var connectedUsers = [];
var connectedEmails = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

var adminUser = {
	email: getProperty("ADMIN.EMAIL"),
	password: md5(getProperty("ADMIN.PASSWORD")),
	firstname: getProperty("ADMIN.FIRSTNAME"),
	lastname: getProperty("ADMIN.LASTNAME")
}

const db = new sqlite3.Database(getProperty('DATABASE.NAME'));
const db_create = fs.readFileSync('configuration/database_create.sql', 'utf8');
const db_reset = fs.readFileSync('configuration/database_reset.sql', 'utf8');

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
	console.log(' => /username');
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
	
	db.run("INSERT INTO users (email, password,firstname,lastname) VALUES (?,?,?,?)",email,password,firstname,lastname, function(err){
		if(err){
			console.log(err);
			res.send("failed");
			return console.error(err.message);
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
	
	db.get('SELECT email,firstname,lastname FROM users WHERE email = ? and password = ?',email,password,function(err, result){
		if(err){
			console.log(err);
			res.send("failed");
			return console.error(err.message);
		}
		else{
			//console.log(result);
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
		
		if(adminUser.id){
			db.all("SELECT message, users.firstname || ' ' || users.lastname username, users.email FROM messages, rooms, users WHERE messages.idroom = rooms.id AND messages.iduser = users.id AND rooms.iduser = ? AND rooms.roomname = 'General' ORDER BY messages.id", adminUser.id ,function(err, result){
				if(err){
					console.log(err);
					res.send("failed");
					return console.error(err.message);
				}
				else{
					// console.log(result);
					if(result){
						io.to(socket.id).emit('load general messages', result);
					}
					else{
						// nothing to do
					}
				}
			});
		}
		else {
			db.get("SELECT id FROM users WHERE email = ?",adminUser.email, function(err,result){
				if(err){
					console.log(err);
				}
				else{
					if(result){
						//.log(result);
						adminUser.id = result.id;
						db.all("SELECT message, users.firstname || ' ' || users.lastname username, users.email FROM messages, rooms, users WHERE messages.idroom = rooms.id AND messages.iduser = users.id AND rooms.iduser = ? AND rooms.roomname = 'General' ORDER BY messages.id", adminUser.id ,function(err1, result1){
							if(err1){
								console.log(err1);
								res.send("failed");
								return console.error(err1.message);
							}
							else{
								// console.log(result);
								if(result1){
									io.to(socket.id).emit('load general messages', result1);
								}
								else{
									// nothing to do
								}
							}
						});
					}
					else{
						console.log('admin account not configured');
					}
				}
			});
		}
		
		socket.on('chat message', function(msg){
			db.run("INSERT INTO messages (idroom, message, iduser) VALUES ((SELECT id FROM rooms WHERE roomname = ? AND iduser IN (SELECT id FROM users WHERE email IN (?,?) )),?, (SELECT id FROM users WHERE email = ? ))", msg.room, msg.email, adminUser.email, msg.message , msg.email, function(err){
				if(err){
					console.log("message not inserted");
				}
				else{
					// nothing to do
				}
			});
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

	databaseConfiguration();
	
	console.log('listening on *:' + port);
});


function databaseConfiguration(){
	/** Tables creation **/
	if("false" == getProperty('DATABASE.DEFAULT.RESET').trim().toLowerCase()){
		db.exec(db_create);
	}
	else{
		db.exec(db_reset);
	}

	/** Tables inserts **/
	db.serialize(function(){
		db.run("INSERT INTO users (email, password,firstname,lastname) VALUES (?,?,?,?)", adminUser.email, adminUser.password, adminUser.firstname,adminUser.lastname, function(err){
			if(err){
				console.log("admin account already inserted in the user table");
			}
			else{
				console.log("insert admin done");
			}
		})
		
		.run("INSERT INTO rooms (roomname, iduser) SELECT 'General' roomname, id iduser FROM users WHERE email = ?", adminUser.email, function(err){
			if(err){
				console.log("General room already inserted in the rooms table");
			}
			else{
				console.log("insert General room done");
			}
		});
	});
}
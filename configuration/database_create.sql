CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, firstname TEXT NOT NULL, lastname TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, roomname TEXT NOT NULL, iduser INTEGER NOT NULL, UNIQUE(roomname,iduser));
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, idroom INTEGER NOT NULL, message TEXT NOT NULL, iduser INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS friends (id INTEGER PRIMARY KEY AUTOINCREMENT, iduser INTEGER NOT NULL, idfriend INTEGER NOT NULL, state CHARACTER(1) NOT NULL, UNIQUE(iduser,idfriend)); -- state = {A = Accepted, W = Waiting}
CREATE TABLE IF NOT EXISTS room_members (id INTEGER PRIMARY KEY AUTOINCREMENT, idroom INTEGER NOT NULL, idmember INTEGER NOT NULL, state CHARACTER(1) NOT NULL, UNIQUE(idroom,idmember)); -- state = {A = Accepted, W = Waiting}
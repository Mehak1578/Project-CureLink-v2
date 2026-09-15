const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./models/Message');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Connect DB
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/dev', require('./routes/dev'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/', (req, res) => res.send({ message: 'CureLink API running' }));

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.io
const io = new Server(server, { cors: { origin: '*' } });
io.on('connection', (socket) => {
	console.log('socket connected', socket.id);

	socket.on('chat:message', async (payload) => {
		// payload should include { from, to, text }
		try {
			const msg = new Message({ from: payload.from, to: payload.to, text: payload.text });
			await msg.save();
			// emit back to sender and target room
			io.emit('chat:message', msg);
		} catch (err) {
			console.error('socket message save error', err);
		}
	});

	socket.on('disconnect', () => {
		console.log('socket disconnected', socket.id);
	});
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
